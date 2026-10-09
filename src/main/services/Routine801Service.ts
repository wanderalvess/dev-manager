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
  normalizeRoutine801Catalog,
  findRepositoryForFeature
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

  /** Consulta um catálogo do servidor da Rotina 801, renovando o login do WTA se a sessão expirou. */
  private async fetchCatalog(path: string, label: string, customUrl?: string): Promise<Routine801CatalogResponse> {
    const baseUrl = this.getServerUrl(customUrl);
    if (!isSafeUrl(baseUrl)) {
      throw new Error(`URL de servidor inválida: ${baseUrl}`);
    }

    const targetUrl = `${baseUrl}/winthor/ferramenta/servidor/v1/${path}`;
    const request = () => httpRequest(targetUrl, { method: 'GET', headers: this.getAuthHeaders(), timeout: 15000 });

    let res = await request();
    if ((res.status === 401 || res.status === 403) && (await this.renewWtaAuth(baseUrl))) {
      res = await request();
    }
    if (!res.ok) {
      throw new Error(`Falha ao obter lista de ${label} (HTTP ${res.status}): ${res.statusText || 'Erro no servidor'}`);
    }

    try {
      return normalizeRoutine801Catalog(JSON.parse(await res.text()));
    } catch {
      throw new Error(`A resposta do servidor de ${label} não é um JSON válido.`);
    }
  }

  /** Obtém a lista de instalações disponíveis consultando o endpoint da Rotina 801. */
  public fetchInstallations(customUrl?: string): Promise<Routine801CatalogResponse> {
    return this.fetchCatalog('instalacao', 'instalações', customUrl);
  }

  /** Obtém a lista de atualizações disponíveis para os pacotes instalados. */
  public fetchUpdates(customUrl?: string): Promise<Routine801CatalogResponse> {
    return this.fetchCatalog('atualizacao', 'atualizações', customUrl);
  }

  /**
   * Instala ou atualiza as funcionalidades selecionadas.
   * Suporta execução via Karaf CLI (com logs em tempo real) ou via API REST da ferramenta.
   */
  public async installFeatures(
    request: Routine801InstallRequest,
    onChunk: (chunk: string) => void = () => {}
  ): Promise<Routine801InstallResult> {
    const {
      funcionalidades,
      repositorios = [],
      action = 'install',
      executeVia = 'karaf_cli',
      serverUrl,
      credentials,
      targetVersionOverride
    } = request;

    if (!funcionalidades || funcionalidades.length === 0) {
      return {
        success: false,
        output: 'Nenhuma funcionalidade selecionada.',
        installedCount: 0,
        failedCount: 0
      };
    }

    // Se o desenvolvedor definiu uma versão alvo específica (ex: forçar 1.38.0.0 ou 1.39.1.6)
    const effectiveFeatures: Routine801Feature[] = funcionalidades.map((f) => ({
      ...f,
      versao: targetVersionOverride && targetVersionOverride.trim() ? targetVersionOverride.trim() : f.versao
    }));

    // Validação de segurança dos nomes e versões antes de executar
    for (const f of effectiveFeatures) {
      if (!isSafeKarafCommand(f.nome) || (f.versao && !isSafeKarafCommand(f.versao))) {
        const err = `Identificador de feature potencialmente inseguro detectado: "${f.nome}". Execução abortada.`;
        onChunk(`[ERRO] ${err}\r\n`);
        return {
          success: false,
          output: err,
          installedCount: 0,
          failedCount: effectiveFeatures.length
        };
      }
    }

    // Modo 1: Execução via API REST da Ferramenta Servidor (WTA)
    if (executeVia === 'api') {
      const baseUrl = this.getServerUrl(serverUrl);
      const actionDesc = action === 'repo_add_only' ? 'registro de repositório' : 'instalação';
      onChunk(`[API] Enviando solicitação de ${actionDesc} de ${effectiveFeatures.length} pacote(s) para ${baseUrl}...\r\n`);

      try {
        const apiPath = `${baseUrl}/winthor/ferramenta/servidor/v1/sistema/instala-com-dependencias`;
        const res = await httpRequest(apiPath, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.getAuthHeaders()
          },
          body: JSON.stringify(effectiveFeatures),
          timeout: 180000
        });

        const text = await res.text();
        if (res.ok) {
          onChunk(`[API] Operação concluída com sucesso no servidor WTA!\r\n${text}\r\n`);
          return {
            success: true,
            output: text,
            installedCount: effectiveFeatures.length,
            failedCount: 0
          };
        } else {
          const err = `Falha na requisição à API (HTTP ${res.status}): ${text}`;
          onChunk(`[ERRO] ${err}\r\n`);
          return {
            success: false,
            output: err,
            installedCount: 0,
            failedCount: effectiveFeatures.length
          };
        }
      } catch (err: any) {
        const msg = `Erro de comunicação com a API da ferramenta servidor: ${err?.message || err}`;
        onChunk(`[ERRO] ${msg}\r\n`);
        return {
          success: false,
          output: msg,
          installedCount: 0,
          failedCount: effectiveFeatures.length
        };
      }
    }

    // Modo 2: Execução direta no Karaf CLI via KarafService (padrão)
    const isRunning = await this.karafService.isKarafRunning(credentials?.port);
    if (!isRunning) {
      const port = credentials?.port || getKarafSshPort(this.configService.getSettings());
      const err = `O contêiner Karaf/OSGi não está em execução (porta SSH ${port} fechada). Inicie o Karaf antes de executar ações no catálogo.`;
      onChunk(`[ERRO] ${err}\r\n`);
      return {
        success: false,
        output: err,
        installedCount: 0,
        failedCount: effectiveFeatures.length
      };
    }

    let totalOutput = '';
    const details: Routine801InstallResult['details'] = [];
    let installedCount = 0;
    let failedCount = 0;

    const total = effectiveFeatures.length;
    const headerTitle =
      action === 'repo_add_only'
        ? `=== Registrando Repositórios Maven no Karaf (${total} item(ns)) ===`
        : `=== Iniciando Instalação do Catálogo Oficial (${total} item(ns)) ===`;
    onChunk(`\r\n${headerTitle}\r\n`);

    for (let i = 0; i < total; i++) {
      const feat = effectiveFeatures[i];
      const stepIdx = `[${i + 1}/${total}]`;
      onChunk(`\r\n${stepIdx} Preparando ${feat.nome} v${feat.versao} (${feat.tipoProjeto || 'SERVIÇO'})...\r\n`);

      // Tenta cruzar com os repositórios informados no catálogo para obter a URL canônica precisa
      let matchedRepo = null;
      if (repositorios && repositorios.length > 0) {
        matchedRepo = findRepositoryForFeature(feat, repositorios);
      }

      // Auto-infere o repositório Maven do WinThor se não retornado explicitamente
      const cmds = buildKarafInstallCommands(feat, matchedRepo, true);

      let stepSuccess = true;
      let stepError = '';

      // Ação Apenas Adicionar Repositório (feature:repo-add)
      if (action === 'repo_add_only') {
        if (!cmds.repoCommand) {
          stepSuccess = false;
          stepError = `Não foi possível determinar a URL Maven para o repositório de ${feat.nome}.`;
          onChunk(`${stepIdx} ✖ Falha ao registrar repositório: ${stepError}\r\n`);
          failedCount++;
        } else {
          onChunk(`${stepIdx} Registrando repositório Maven: ${cmds.repoCommand}\r\n`);
          const repoRes = await this.karafService.executeKarafCommand(
            cmds.repoCommand,
            (chunk) => {
              totalOutput += chunk;
              onChunk(chunk);
            },
            credentials,
            180000
          );

          if (repoRes.code === 0 || repoRes.stderr?.includes('already registered')) {
            onChunk(`${stepIdx} ✔ Sucesso: Repositório Maven registrado no Karaf.\r\n`);
            installedCount++;
          } else {
            stepSuccess = false;
            stepError = repoRes.stderr || repoRes.stdout || 'Erro ao registrar repositório';
            onChunk(`${stepIdx} ✖ Falha ao registrar repositório: ${stepError}\r\n`);
            failedCount++;
          }
        }

        details.push({
          featureName: feat.nome,
          version: feat.versao,
          success: stepSuccess,
          error: stepError || undefined
        });
        continue;
      }

      // Ação Padrão: Adicionar Repositório + Instalar Feature
      // 1. Adicionar repositório maven caso configurado ou auto-inferido (timeout 180s)
      if (cmds.repoCommand) {
        onChunk(`${stepIdx} Registrando repositório: ${cmds.repoCommand}\r\n`);
        const repoRes = await this.karafService.executeKarafCommand(
          cmds.repoCommand,
          (chunk) => {
            totalOutput += chunk;
            onChunk(chunk);
          },
          credentials,
          180000
        );

        if (repoRes.code !== 0 && !repoRes.stderr?.includes('already registered')) {
          onChunk(`${stepIdx} [AVISO] O registro do repositório retornou aviso: ${repoRes.stderr || repoRes.stdout}\r\n`);
        }
      }

      // 2. Instalar a feature (feature:install -r -u) (timeout 300s para download e resolução OSGi)
      onChunk(`${stepIdx} Executando: ${cmds.installCommand}\r\n`);
      const installRes = await this.karafService.executeKarafCommand(
        cmds.installCommand,
        (chunk) => {
          totalOutput += chunk;
          onChunk(chunk);
        },
        credentials,
        300000
      );

      if (installRes.code === 0) {
        onChunk(`${stepIdx} ✔ Sucesso: ${feat.nome} v${feat.versao} instalado no container OSGi.\r\n`);
        installedCount++;
      } else {
        stepSuccess = false;
        stepError = installRes.stderr || installRes.stdout || 'Erro ao executar feature:install';
        onChunk(`${stepIdx} ✖ Falha ao instalar ${feat.nome}: ${stepError}\r\n`);
        if (/No matching features for/i.test(stepError)) {
          onChunk(
            `\r\n💡 [DICA] O Karaf não encontrou a feature no repositório Maven. Verifique se o repositório Maven (Nexus TOTVS) está configurado em "etc/org.ops4j.pax.url.mvn.cfg" ou experimente executar pelo modo "API WTA" no cabeçalho do Catálogo.\r\n`
          );
        }
        failedCount++;
      }

      details.push({
        featureName: feat.nome,
        version: feat.versao,
        success: stepSuccess,
        error: stepError || undefined
      });
    }

    const summaryWord = action === 'repo_add_only' ? 'registrado(s)' : 'instalado(s)';
    onChunk(`\r\n=== Concluído: ${installedCount} ${summaryWord}, ${failedCount} com falha ===\r\n`);

    return {
      success: failedCount === 0,
      output: totalOutput,
      installedCount,
      failedCount,
      details
    };
  }
}
