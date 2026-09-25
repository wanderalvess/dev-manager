import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { httpRequest } from '../utils/httpRequest';
import { isSafeKarafCommand, isSafeUrl } from '../utils/security';
import {
  Routine801CatalogResponse,
  Routine801Feature,
  Routine801InstallRequest,
  Routine801InstallResult,
  getKarafSshPort
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
   * Monta headers de autenticação para o WTA (suporta cookie suukie e Bearer token JWT).
   */
  public getAuthHeaders(): Record<string, string> {
    const settings = this.configService.getSettings();
    const headers: Record<string, string> = {
      Accept: 'application/json'
    };

    if (settings.wtaAuthToken) {
      const rawToken = settings.wtaAuthToken.trim().replace(/^suukie=/, '');
      headers['Cookie'] = `suukie=${rawToken}`;
      headers['Authorization'] = `Bearer ${rawToken}`;
    }

    return headers;
  }

  /**
   * Tenta renovar a autenticação no WTA caso o token tenha expirado ou a requisição retorne 401/403.
   */
  public async renewWtaAuth(baseUrl: string): Promise<string | null> {
    const settings = this.configService.getSettings();
    const login = settings.wtaLogin?.trim();
    const senha = settings.wtaPassword?.trim();

    if (!login || !senha) return null;

    try {
      const loginUrl = `${baseUrl}/winthor/autenticacao/v1/login`;
      const res = await httpRequest(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ login, senha }),
        timeout: 5000
      });

      if (res.ok) {
        let token: string | null = null;
        try {
          const data = JSON.parse(await res.text());
          if (data && typeof data.accessToken === 'string') {
            token = data.accessToken;
          }
        } catch {
          // ignore
        }
        if (token) {
          this.configService.saveSettings({ wtaAuthToken: token });
          return token;
        }
      }
    } catch {
      // Ignora erro de renovação automática
    }
    return null;
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
      let res = await httpRequest(testUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });

      // Se retornou 401/403, tenta renovar token e tentar novamente
      if ((res.status === 401 || res.status === 403) && (await this.renewWtaAuth(baseUrl))) {
        res = await httpRequest(testUrl, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          timeout: 5000
        });
      }

      if (res.ok) {
        return {
          ok: true,
          status: res.status,
          message: 'Serviço da Rotina 801 online e respondendo.',
          url: baseUrl
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          status: res.status,
          message: `Servidor ativo em ${baseUrl}, mas recusou acesso (HTTP ${res.status}). Verifique o usuário e senha do WTA nas Configurações.`,
          url: baseUrl
        };
      }

      if (res.status === 404) {
        return {
          ok: false,
          status: res.status,
          message: `Servidor ativo em ${baseUrl}, mas endpoint da Rotina 801 não foi encontrado (HTTP 404). Verifique se o pacote ferramenta-servidor está ativo no Karaf.`,
          url: baseUrl
        };
      }

      return {
        ok: false,
        status: res.status,
        message: `Servidor retornou erro HTTP ${res.status}: ${res.statusText}`,
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
    let res = await httpRequest(targetUrl, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      timeout: 15000
    });

    if ((res.status === 401 || res.status === 403) && (await this.renewWtaAuth(baseUrl))) {
      res = await httpRequest(targetUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 15000
      });
    }

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
    let res = await httpRequest(targetUrl, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      timeout: 15000
    });

    if ((res.status === 401 || res.status === 403) && (await this.renewWtaAuth(baseUrl))) {
      res = await httpRequest(targetUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 15000
      });
    }

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
            Accept: 'application/json',
            ...this.getAuthHeaders()
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
    const isRunning = await this.karafService.isKarafRunning(credentials?.port);
    if (!isRunning) {
      const port = credentials?.port || getKarafSshPort(this.configService.getSettings());
      const err = `O contêiner Karaf/OSGi não está em execução (porta SSH ${port} fechada). Inicie o Karaf antes de instalar features do catálogo.`;
      onChunk(`[ERRO] ${err}\r\n`);
      return {
        success: false,
        output: err,
        installedCount: 0,
        failedCount: funcionalidades.length
      };
    }

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
