import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WshUpdateService } from '../../main/services/wsh/WshUpdateService';

interface WshToolDeps {
  wshUpdateService: WshUpdateService;
  ok: (data: unknown) => unknown;
  fail: (message: string) => unknown;
}

const container = z.string().describe('Nome do container do WSH (ex.: "wsh-40"), o mesmo do `docker ps`');
const distro = z.string().optional().describe('Distro WSL do Docker; sem ele o Hub procura a que tem o Docker');
const version = z.string().describe('Versão do WSH no formato 1.39.22.31 (a do instalador publicado pela TOTVS)');
const optionalVersion = z.string().optional().describe('Versão do WSH no formato 1.39.22.31; ignorada quando localFile é informado (vale a do jar)');
const localFile = z.string().optional().describe('Caminho no Windows de um instalador (.exe) ou jar (.jar) já baixado, usado no lugar do download (ex.: sem acesso ao servidor da TOTVS)');

/** Atualização do jar do WSH (winthor-integracao-core) de um container: mesma lógica da aba "Atualizar WSH". */
export function registerWshTools(server: McpServer, { wshUpdateService, ok, fail }: WshToolDeps): void {
  const reply = ok as (data: unknown) => never;
  const error = fail as (message: string) => never;

  server.registerTool(
    'wsh_get_jar_info',
    {
      title: 'Jar do WSH em uso num container',
      description:
        'Lê o container do WSH e devolve o caminho do jar montado nele (em /opt do WSL), a versão (Implementation-Version do manifest), o que esse jar exige do WTA (dependencies.json), o container do WTA do ambiente e os backups de jar guardados ao lado. Só lê.',
      inputSchema: { container, distro }
    },
    async ({ container: name, distro: d }) => {
      const r = await wshUpdateService.inspect({ container: name, distro: d });
      return r.success ? reply(r) : error(r.error || 'Não foi possível ler o container.');
    }
  );

  server.registerTool(
    'wsh_check_installer',
    {
      title: 'Conferir se a TOTVS publicou uma versão do WSH',
      description: 'Consulta só os cabeçalhos do instalador oficial do WSH daquela versão e devolve o endereço, o tamanho e a data. Não baixa nada.',
      inputSchema: { version }
    },
    async ({ version: v }) => {
      const r = await wshUpdateService.probe(v);
      return r.success ? reply(r) : error(r.error || 'Versão não encontrada.');
    }
  );

  server.registerTool(
    'wsh_list_installers',
    {
      title: 'Listar as versões do WSH publicadas pela TOTVS',
      description: 'Lista as versões do instalador do WSH publicadas no bucket da TOTVS (da mais nova para a mais antiga), com data de publicação e tamanho. Só lê. Use antes de wsh_prepare_update para escolher a versão.'
    },
    async () => {
      const r = await wshUpdateService.listInstallers();
      return r.success ? reply(r) : error(r.error || 'Não foi possível listar as versões.');
    }
  );

  server.registerTool(
    'wsh_prepare_update',
    {
      title: 'Baixar o instalador do WSH e preparar o jar novo',
      description:
        'Baixa o instalador oficial da versão (cerca de 96 MB, MD5 conferido contra o servidor) ou, com localFile, abre o instalador (.exe) ou o jar (.jar) que a pessoa já tem, e tira o winthor-integracao-core.jar de dentro dele sem executar nada, confere a versão do manifest e compara o que o jar exige do WTA (dependencies.json) com as features instaladas no Karaf do WTA do ambiente. Grava o jar numa pasta temporária; não altera o container. Devolve o veredito (newer, same, older), as exigências e a conferência (checks[].ok = false significa que o WSH encerraria ao subir). Leva alguns segundos a minutos.',
      inputSchema: { container, version: optionalVersion, localFile, distro }
    },
    async ({ container: name, version: v, localFile: file, distro: d }) => {
      const r = await wshUpdateService.prepare({ container: name, version: v, localFile: file, distro: d });
      return r.success ? reply(r) : error(r.error || 'Falha ao preparar o jar.');
    }
  );

  server.registerTool(
    'wsh_clear_downloads',
    {
      title: 'Apagar os instaladores do WSH baixados',
      description: 'Apaga a pasta temporária do Hub com os instaladores e jars baixados por wsh_prepare_update (cerca de 170 MB por versão) e devolve quanto liberou. O jar em uso nos containers e os backups ao lado dele não são tocados.'
    },
    async () => {
      const r = wshUpdateService.clearCache();
      return r.success ? reply(r) : error(r.error || 'Não foi possível apagar os arquivos baixados.');
    }
  );

  server.registerTool(
    'wsh_apply_update',
    {
      title: 'Trocar o jar do WSH e reiniciar o container',
      description:
        'Troca o jar montado no container pelo preparado por wsh_prepare_update (a mesma versão), guardando o atual ao lado como .bak-<versão>, e reinicia o container esperando até 3 minutos o log mostrar "Started WinthorSmartHubeApplication". Exige wsh_prepare_update antes e deve ser chamada só depois de revisar a conferência das features do WTA: com feature faltando o WSH encerra ao subir. started=false indica que a subida não foi confirmada (use wsh_rollback_jar).',
      inputSchema: { container, version, distro }
    },
    async ({ container: name, version: v, distro: d }) => {
      const r = await wshUpdateService.apply({ container: name, version: v, distro: d });
      return r.success ? reply(r) : error(r.error || 'Falha ao trocar o jar.');
    }
  );

  server.registerTool(
    'wsh_rollback_jar',
    {
      title: 'Voltar ao jar anterior do WSH',
      description: 'Restaura o backup do jar (por padrão o mais recente, listado em wsh_get_jar_info) no lugar do jar atual e reinicia o container esperando o WSH subir.',
      inputSchema: { container, distro, backup: z.string().optional().describe('Nome do arquivo de backup, como em wsh_get_jar_info; sem ele, o mais recente') }
    },
    async ({ container: name, distro: d, backup }) => {
      const r = await wshUpdateService.rollback({ container: name, distro: d, backup });
      return r.success ? reply(r) : error(r.error || 'Falha ao restaurar o jar.');
    }
  );
}
