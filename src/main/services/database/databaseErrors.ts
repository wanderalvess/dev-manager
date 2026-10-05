import type { DatabaseConnectionConfig } from '../../../shared/types';
import { getListeningPid } from '../../utils/network';

/**
 * Quando a falha de autenticação ocorre contra um host loopback, verifica se a porta já
 * está ocupada por outro processo local — sintoma de um túnel SSH (-L) que não conseguiu
 * abrir o bind e a conexão caiu silenciosamente num serviço local diferente do pretendido.
 */
async function describeLocalPortConflict(config: DatabaseConnectionConfig): Promise<string> {
  const loopbackHosts = ['localhost', '127.0.0.1', '::1'];
  if (!loopbackHosts.includes((config.host || '').toLowerCase())) return '';

  const listener = await getListeningPid(config.port);
  if (!listener) return '';

  const expectedProcessNames: Record<DatabaseConnectionConfig['type'], string[]> = {
    postgres: ['postgres'],
    mysql: ['mysqld', 'mysql'],
    oracle: ['oracle', 'tnslsnr']
  };
  const name = listener.processName.toLowerCase();
  const looksLikeExpectedEngine = (expectedProcessNames[config.type] || []).some((keyword) =>
    name.includes(keyword)
  );
  if (looksLikeExpectedEngine) return '';

  return ` Atenção: a porta ${config.port} em ${config.host} já está em uso pelo processo "${listener.processName}" (PID ${listener.pid}) nesta máquina, que não parece ser um ${config.type.toUpperCase()} — confirme que não é outro banco de dados antes de revisar usuário/senha (sintoma comum de túnel SSH -L que não conseguiu abrir a porta local e caiu num serviço já existente ali).`;
}

export async function formatErrorMessage(err: any, config: DatabaseConnectionConfig): Promise<string> {
  const type = config.type;
  const msg = err?.message || String(err);
  if (msg.includes('ORA-01008')) {
    return 'Erro ORA-01008: Nem todas as variáveis foram vinculadas. Preencha os valores de todos os parâmetros (:PARAMETRO) antes de executar a consulta.';
  }
  if (msg.includes('NJS-138')) {
    return 'Erro NJS-138: Este banco de dados Oracle (ex: versão 11g) não é compatível com o Thin Mode padrão. Ative a opção "Modo Thick (Oracle Instant Client)" na conexão e certifique-se de ter o Oracle Instant Client 64-bit instalado.';
  }
  if (msg.includes('DPI-1047')) {
    return 'Erro DPI-1047: Não foi possível carregar a biblioteca Oracle Client de 64 bits (oci.dll). Verifique se o caminho do Instant Client informado está correto e se o Microsoft Visual C++ Redistributable (x64) está instalado.';
  }
  if (msg.includes('DPI-1072')) {
    return 'Erro DPI-1072: Falha ao inicializar o Oracle Client. Verifique se a versão do Instant Client é compatível com a arquitetura (64 bits) e se o Visual C++ Redistributable está instalado.';
  }
  if (msg.includes('ECONNREFUSED')) {
    return `Conexão recusada no servidor ${type.toUpperCase()}. Verifique se o banco de dados está ativo e a porta correta.`;
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
    return `Tempo limite esgotado ao tentar conectar ao servidor ${type.toUpperCase()}. Verifique o firewall e o endereço de host.`;
  }
  if (msg.includes('password authentication failed') || msg.includes('Access denied') || msg.includes('ORA-01017')) {
    const hint = await describeLocalPortConflict(config);
    return `Falha de autenticação: Usuário ou senha incorretos para ${type.toUpperCase()}.${hint}`;
  }
  if (msg.includes('ORA-12541') || msg.includes('TNS:no listener')) {
    return 'Oracle Listener não encontrado no host e porta especificados (ORA-12541).';
  }
  if (msg.includes('ORA-12514') || msg.includes('TNS:listener does not currently know of service')) {
    return 'Serviço/Banco Oracle não encontrado pelo Listener (ORA-12514). Verifique o Service Name / SID.';
  }
  return msg;
}
