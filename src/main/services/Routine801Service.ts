import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { httpRequest } from '../utils/httpRequest';
import { isSafeKarafCommand, isSafeUrl } from '../utils/security';
import {
  Routine801CatalogResponse,
  Routine801Feature,
  Routine801InstallRequest,
  Routine801InstallResult
} from '../../shared/types';
import {
  buildKarafInstallCommands,
  normalizeRoutine801Catalog
} from '../utils/routine801Utils';

export class Routine801Service {
  private configService: ConfigService;
  private karafService: KarafService;

  constructor(configService: ConfigService, karafService: KarafService) {
    this.configService = configService;
    this.karafService = karafService;
  }

  /**
   * Determina a URL base da ferramenta servidor.
   * Prioridade: URL passada explicitamente -> settings.routine801Url -> settings.wtaUrl -> http://localhost:8889
   */
  public getServerUrl(customUrl?: string): string {
    const settings = this.configService.getSettings();
    let url = (customUrl || settings.routine801Url || settings.wtaUrl || 'http://localhost:8889').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    return url.replace(/\/+$/, '');
  }

  /**
   * Checa se o serviço HTTP da ferramenta servidor está acessível na porta configurada.
   */
  public async checkServerHealth(
    customUrl?: string
  ): Promise<{ ok: boolean; status: number; message: string; url: string }> {
    const baseUrl = this.getServerUrl(customUrl);
    if (!isSafeUrl(baseUrl)) {
      return { ok: false, status: 0, message: 'URL do servidor inválida.', url: baseUrl };
    }

    const testUrl = `${baseUrl}/winthor/ferramenta/servidor/v1/instalacao`;
    try {
      const res = await httpRequest(testUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 4000
      });

      // Status 200 = sucesso; status 401/403 = servidor Karaf/Shiro ativo mas exigindo auth
      const isAlive = res.status < 500;
      return {
        ok: isAlive,
        status: res.status,
        message: isAlive
          ? 'Serviço da Rotina 801 online e respondendo.'
          : `Servidor retornou erro HTTP ${res.status}: ${res.statusText}`,
        url: baseUrl
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: `Não foi possível conectar ao servidor em ${baseUrl} (${err?.message || 'Conexão recusada ou timeout'}).`,
        url: baseUrl
      };
    }
  }

  /**
   * Obtém a lista de instalações disponíveis consultando o endpoint da Rotina 801.
   */
  public async fetchInstallations(customUrl?: string): Promise<Routine801CatalogResponse> {
    const baseUrl = this.getServerUrl(customUrl);
    if (!isSafeUrl(baseUrl)) {
      throw new Error(`URL de servidor inválida: ${baseUrl}`);
    }

    const targetUrl = `${baseUrl}/winthor/ferramenta/servidor/v1/instalacao`;
    const res = await httpRequest(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!res.ok) {
      throw new Error(
        `Falha ao obter lista de instalações (HTTP ${res.status}): ${res.statusText || 'Erro no servidor'}`
      );
    }

    const rawText = await res.text();
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new Error('A resposta do servidor de instalações não é um JSON válido.');
    }

    return normalizeRoutine801Catalog(parsedJson);
  }

  /**
   * Obtém a lista de atualizações disponíveis para os pacotes instalados.
   */
  public async fetchUpdates(customUrl?: string): Promise<Routine801CatalogResponse> {
    const baseUrl = this.getServerUrl(customUrl);
    if (!isSafeUrl(baseUrl)) {
      throw new Error(`URL de servidor inválida: ${baseUrl}`);
    }

    const targetUrl = `${baseUrl}/winthor/ferramenta/servidor/v1/atualizacao`;
    const res = await httpRequest(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!res.ok) {
      throw new Error(
        `Falha ao obter lista de atualizações (HTTP ${res.status}): ${res.statusText || 'Erro no servidor'}`
      );
    }

    const rawText = await res.text();
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new Error('A resposta do servidor de atualizações não é um JSON válido.');
    }

    return normalizeRoutine801Catalog(parsedJson);
  }

  /**
   * Instala ou atualiza as funcionalidades selecionadas.
   * Suporta execução via Karaf CLI (com logs em tempo real) ou via API REST da ferramenta.
   */
  public async installFeatures(
    request: Routine801InstallRequest,
    onChunk: (chunk: string) => void = () => {}
  ): Promise<Routine801InstallResult> {
    const { funcionalidades, executeVia = 'karaf_cli', serverUrl, credentials } = request;

    if (!funcionalidades || funcionalidades.length === 0) {
      return {
        success: false,
        output: 'Nenhuma funcionalidade selecionada para instalação.',
        installedCount: 0,
        failedCount: 0
      };
    }

    // Validação de segurança dos nomes e versões antes de executar
    for (const f of funcionalidades) {
      if (!isSafeKarafCommand(f.nome) || (f.versao && !isSafeKarafCommand(f.versao))) {
        const err = `Identificador de feature potencialmente inseguro detectado: "${f.nome}". Execução abortada.`;
        onChunk(`[ERRO] ${err}\r\n`);
        return {
          success: false,
          output: err,
          installedCount: 0,
          failedCount: funcionalidades.length
        };
      }
    }

    // Modo 1: Execução via API REST da Ferramenta Servidor
    if (executeVia === 'api') {
      const baseUrl = this.getServerUrl(serverUrl);
      onChunk(`[API] Enviando solicitação de instalação de ${funcionalidades.length} pacote(s) para ${baseUrl}...\r\n`);

      try {
        const apiPath = `${baseUrl}/winthor/ferramenta/servidor/v1/sistema/instala-com-dependencias`;
        const res = await httpRequest(apiPath, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(funcionalidades),
          timeout: 60000
        });

        const text = await res.text();
        if (res.ok) {
          onChunk(`[API] Instalação concluída com sucesso no servidor!\r\n${text}\r\n`);
          return {
            success: true,
            output: text,
            installedCount: funcionalidades.length,
            failedCount: 0
          };
        } else {
          const err = `Falha na requisição à API (HTTP ${res.status}): ${text}`;
          onChunk(`[ERRO] ${err}\r\n`);
          return {
            success: false,
            output: err,
            installedCount: 0,
            failedCount: funcionalidades.length
          };
        }
      } catch (err: any) {
        const msg = `Erro de comunicação com a API da ferramenta servidor: ${err?.message || err}`;
        onChunk(`[ERRO] ${msg}\r\n`);
        return {
          success: false,
          output: msg,
          installedCount: 0,
          failedCount: funcionalidades.length
        };
      }
    }

    // Modo 2: Execução direta no Karaf CLI via KarafService (padrão)
    let totalOutput = '';
    const details: Routine801InstallResult['details'] = [];
    let installedCount = 0;
    let failedCount = 0;

    const total = funcionalidades.length;
    onChunk(`\r\n=== Iniciando Instalação do Catálogo Oficial (${total} item(ns)) ===\r\n`);

    for (let i = 0; i < total; i++) {
      const feat = funcionalidades[i];
      const stepIdx = `[${i + 1}/${total}]`;
      onChunk(`\r\n${stepIdx} Preparando ${feat.nome} v${feat.versao} (${feat.tipoProjeto || 'SERVIÇO'})...\r\n`);

      const cmds = buildKarafInstallCommands(feat);

      let stepSuccess = true;
      let stepError = '';

      // 1. Adicionar repositório maven caso exista URL configurada
      if (cmds.repoCommand) {
        onChunk(`${stepIdx} Registrando repositório: ${cmds.repoCommand}\r\n`);
        const repoRes = await this.karafService.executeKarafCommand(
          cmds.repoCommand,
          (chunk) => {
            totalOutput += chunk;
            onChunk(chunk);
          },
          credentials
        );

        if (repoRes.code !== 0 && !repoRes.stderr?.includes('already registered')) {
          onChunk(`${stepIdx} [AVISO] O registro do repositório retornou aviso: ${repoRes.stderr || repoRes.stdout}\r\n`);
        }
      }

      // 2. Instalar a feature (feature:install -r -u)
      onChunk(`${stepIdx} Executando: ${cmds.installCommand}\r\n`);
      const installRes = await this.karafService.executeKarafCommand(
        cmds.installCommand,
        (chunk) => {
          totalOutput += chunk;
          onChunk(chunk);
        },
        credentials
      );

      if (installRes.code === 0) {
        onChunk(`${stepIdx} ✔ Sucesso: ${feat.nome} instalado no container OSGi.\r\n`);
        installedCount++;
      } else {
        stepSuccess = false;
        stepError = installRes.stderr || installRes.stdout || 'Erro ao executar feature:install';
        onChunk(`${stepIdx} ✖ Falha ao instalar ${feat.nome}: ${stepError}\r\n`);
        failedCount++;
      }

      details.push({
        featureName: feat.nome,
        version: feat.versao,
        success: stepSuccess,
        error: stepError || undefined
      });
    }

    onChunk(`\r\n=== Concluído: ${installedCount} instalado(s), ${failedCount} com falha ===\r\n`);

    return {
      success: failedCount === 0,
      output: totalOutput,
      installedCount,
      failedCount,
      details
    };
  }
}
