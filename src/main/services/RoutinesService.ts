import http from 'http';
import fs from 'fs';
import path from 'path';
import {
  RoutineItem,
  RoutineLaunchResult,
  KarafWtaStatusResult,
  RoutineDownloadRequest,
  RoutineDownloadResult,
  CcwCatalogItem,
  CcwCatalogResponse,
  ExecutableVersionInfo,
  RoutineBackupEntry,
  RoutineRollbackResult,
  BatchRoutineDownloadRequest,
  BatchRoutineItemProgress,
  BatchRoutineDownloadResult
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { isSafePath, isSafeLocalPath } from '../utils/security';
import { readExecutableVersion } from '../utils/peVersionUtils';
import {
  formatBytes,
  formatBackupDate,
  parseBackupFileName,
  isBackupForRoutine,
  createPreRollbackBackupPath
} from '../utils/routineBackupUtils';
import {
  normalizeRoutineTarget,
  buildCcwDownloadUrl,
  resolveTargetRoutineDirectory,
  createBackupFilePath,
  processRoutineDownloadBuffer
} from '../utils/ccwRoutineUtils';
import {
  isConnectionRefusedError,
  buildWinthorStartPayload,
  shouldUseWinthorStart,
  launchProcessSafely
} from '../utils/routineLaunchUtils';

const DEFAULT_ROUTINE_EXTENSIONS = ['.EXE'];

/**
 * Extrai o código numérico da rotina a partir do nome do executável.
 * Exemplos:
 *  - "PCSIS132.EXE" -> "132"
 *  - "132.EXE" -> "132"
 *  - "ROTINA529.EXE" -> "529"
 *  - "PCSIS1203.exe" -> "1203"
 *  - "PC1406.EXE" -> "1406"
 *  - "PCINF000.EXE" -> "000"
 */
export function extractRoutineCode(fileNameOrPath: string): string | null {
  if (!fileNameOrPath || typeof fileNameOrPath !== 'string') return null;
  // Extrai o último segmento de caminho suportando separadores Windows (\) e POSIX (/)
  const cleanName = fileNameOrPath.split(/[\\/]/).pop() || fileNameOrPath;
  const ext = path.extname(cleanName);
  const baseName = (ext ? cleanName.slice(0, -ext.length) : cleanName).trim().toUpperCase();

  // Padrão clássico: PCSIS followed by numbers (ex: PCSIS132, PCSIS1000)
  const pcsisMatch = baseName.match(/^PCSIS(\d+)$/i);
  if (pcsisMatch) return pcsisMatch[1];

  // Apenas dígitos (ex: 132, 1203)
  const numericMatch = baseName.match(/^(\d+)$/);
  if (numericMatch) return numericMatch[1];

  // Prefixo de rotina genérico ou TOTVS seguido por números (ex: ROTINA132, ROT_132, PCINF000, PCROT123, PC1406)
  const genericMatch = baseName.match(/^(?:ROTINA|ROT|SIS|PCINF|PCROT|PC)[_ -]?(\d+)$/i);
  if (genericMatch) return genericMatch[1];

  return null;
}

export class RoutinesService {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  /**
   * Realiza login no WTA caso usuário e senha estejam configurados, salvando o token em memória e settings.
   */
  public async loginWta(): Promise<string | null> {
    const settings = this.configService.getSettings();
    const wtaUrl = settings.wtaUrl || 'http://localhost:8889';
    const login = settings.wtaLogin?.trim();
    const senha = settings.wtaPassword?.trim();

    if (!login || !senha) {
      return null;
    }

    try {
      console.log(`[RoutinesService] Tentando autenticação automática no WTA (${wtaUrl}) com usuário "${login}"...`);
      const res = await fetch(`${wtaUrl.replace(/\/+$/, '')}/winthor/autenticacao/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ login, senha }),
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        console.warn(`[RoutinesService] Falha ao autenticar no WTA: HTTP ${res.status} ${res.statusText}`);
        return null;
      }

      // Tenta capturar do Set-Cookie ou do JSON body { accessToken }
      let token: string | null = null;
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/suukie=([^;]+)/);
        if (match) token = match[1];
      }

      if (!token) {
        const data = await res.json().catch(() => null);
        if (data && typeof data.accessToken === 'string') {
          token = data.accessToken;
        }
      }

      if (token) {
        console.log(`[RoutinesService] Autenticação no WTA realizada com sucesso! Novo token gerado.`);
        this.configService.saveSettings({ wtaAuthToken: token });
        return token;
      }
    } catch (err: any) {
      console.warn(`[RoutinesService] Erro durante login automático no WTA:`, err?.message || err);
    }
    return null;
  }

  /**
   * Checa se o Apache Karaf / WTA está online e respondendo na porta configurada (padrão 8889).
   */
  public async checkKarafWtaStatus(): Promise<KarafWtaStatusResult> {
    const settings = this.configService.getSettings();
    const wtaUrl = (settings.wtaUrl || 'http://localhost:8889').trim();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${wtaUrl.replace(/\/+$/, '')}/winthor/autenticacao/v1/login`, {
        method: 'OPTIONS',
        signal: controller.signal
      }).catch(async (optionsErr) => {
        if (isConnectionRefusedError(optionsErr)) {
          throw optionsErr;
        }
        return await fetch(wtaUrl, { signal: controller.signal });
      });
      clearTimeout(timer);

      const isAlive = Boolean(res && res.status > 0);
      return {
        online: isAlive,
        wtaUrl,
        message: isAlive
          ? `Apache Karaf / WTA online em ${wtaUrl}.`
          : `Servidor em ${wtaUrl} não respondeu.`
      };
    } catch {
      return {
        online: false,
        wtaUrl,
        message: `Apache Karaf / WTA inacessível em ${wtaUrl}. O servidor não está em execução.`
      };
    }
  }

  /**
   * Tenta disparar a rotina através do serviço Winthor Start (DataSnap REST na porta 9195).
   */
  public async launchViaWinthorStart(routineCode: string): Promise<RoutineLaunchResult> {
    let settings = this.configService.getSettings();
    const port = settings.winthorStartPort || 9195;
    const wtaUrl = (settings.wtaUrl || 'http://localhost:8889').trim();

    let isKarafUnreachable = false;
    let isAuthRejected = false;
    let rawWtaParams: Record<string, string> | undefined;

    try {
      // 1. Tentar obter parâmetros de launch autenticados do WTA (se disponível)
      const fetchParamsFromWta = async (token?: string): Promise<{ ok: boolean; status?: number; error?: string }> => {
        try {
          const fetchUrl = `${wtaUrl.replace(/\/+$/, '')}/winthor/ferramenta/acesso/v1/rotina/launch/parametros?rotina=${routineCode}`;
          const headers: Record<string, string> = {
            Accept: 'application/json'
          };
          const activeToken = token || settings.wtaAuthToken;
          if (activeToken) {
            const cleanToken = activeToken.trim().replace(/^suukie=/, '');
            headers['Cookie'] = `suukie=${cleanToken}`;
            headers['Authorization'] = `Bearer ${cleanToken}`;
          }

          const res = await fetch(fetchUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(5000)
          });

          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data && typeof data === 'object') {
              rawWtaParams = {
                m: data.m || '',
                u: data.u || '',
                p: data.p || '',
                t: data.t || '',
                s: data.s || ''
              };
              return { ok: true, status: res.status };
            }
          }

          if (res.status === 401 || res.status === 403) {
            isAuthRejected = true;
            return { ok: false, status: res.status, error: `HTTP ${res.status}` };
          }

          return { ok: false, status: res.status, error: `HTTP ${res.status} ${res.statusText}` };
        } catch (err: any) {
          if (isConnectionRefusedError(err)) {
            isKarafUnreachable = true;
          }
          return { ok: false, error: err?.message || 'Falha de conexão com o WTA' };
        }
      };

      let fetchRes = await fetchParamsFromWta();

      // Se falhou e temos credenciais configuradas e o servidor não está inacessível, tenta renovar via login
      if (!fetchRes.ok && !isKarafUnreachable && settings.wtaLogin && settings.wtaPassword) {
        const freshToken = await this.loginWta();
        if (freshToken) {
          isAuthRejected = false;
          settings = this.configService.getSettings();
          fetchRes = await fetchParamsFromWta(freshToken);
        }
      }

      // Monta o payload validando parâmetros necessários para a sessão WinThor
      const { payload, hasValidParams, fromDefault } = buildWinthorStartPayload(
        rawWtaParams,
        settings.winthorStartDefaultPayload
      );

      // Se não conseguimos parâmetros válidos e o Karaf está inacessível:
      if (!hasValidParams && isKarafUnreachable) {
        console.warn(`[RoutinesService] Falha ao disparar rotina ${routineCode}: Apache Karaf / WTA (${wtaUrl}) não está em execução.`);
        return {
          success: false,
          karafOffline: true,
          error: 'KARAF_OFFLINE',
          message: `O Apache Karaf (WTA) não está em execução em ${wtaUrl}. O WinThor Start precisa do Karaf ativo na porta 8889 para autenticar a sessão do usuário. Inicie o Karaf antes de executar a rotina.`
        };
      }

      // Se não conseguimos parâmetros válidos e houve rejeição de autenticação:
      if (!hasValidParams && isAuthRejected) {
        console.warn(`[RoutinesService] Falha de autenticação no WTA (${wtaUrl}) para a rotina ${routineCode}.`);
        return {
          success: false,
          authFailed: true,
          error: 'AUTH_FAILED',
          message: `Falha de autenticação no WinThor Anywhere (${wtaUrl}). Verifique se o usuário e senha do WTA nas Configurações estão corretos.`
        };
      }

      // Se ainda não temos parâmetros válidos:
      if (!hasValidParams) {
        console.warn(`[RoutinesService] Parâmetros de sessão incompletos para a rotina ${routineCode}.`);
        return {
          success: false,
          authFailed: true,
          error: 'SESSION_PARAMS_MISSING',
          message: `Não foi possível obter os parâmetros de autenticação da rotina ${routineCode} junto ao WTA (${wtaUrl}). Verifique se o Karaf e o serviço WTA estão ativos.`
        };
      }

      if (fromDefault) {
        console.log(`[RoutinesService] Utilizando payload de sessão pré-configurado para a rotina ${routineCode}.`);
      }

      // 2. Disparar Winthor Start via DataSnap REST
      console.log(`[RoutinesService] Enviando POST para Winthor Start: http://localhost:${port}/datasnap/rest/TServicos/AbrirRotina/${routineCode}`);
      console.log(`[RoutinesService] Payload:`, JSON.stringify(payload));

      return await new Promise<RoutineLaunchResult>((resolve) => {
        const postData = JSON.stringify(payload);
        const req = http.request(
          {
            hostname: 'localhost',
            port,
            path: `/datasnap/rest/TServicos/AbrirRotina/${routineCode}`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              'Content-Length': Buffer.byteLength(postData),
              Accept: 'application/json',
              Origin: wtaUrl
            },
            timeout: 8000
          },
          (res) => {
            let resBody = '';
            res.on('data', (c) => { resBody += c; });
            res.on('end', () => {
              console.log(`[RoutinesService] Winthor Start respondeu: ${res.statusCode} ${res.statusMessage} - Body: ${resBody}`);
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const bodyJson = JSON.parse(resBody);
                  if (bodyJson && bodyJson.status === 'ERRO') {
                    const errMsg = bodyJson.msg || 'Erro funcional retornado pelo WinThor Start';
                    console.warn(`[RoutinesService] Winthor Start retornou erro funcional: ${errMsg}`);
                    resolve({
                      success: false,
                      error: 'WINTHOR_START_ERROR',
                      message: `O WinThor Start recusou a inicialização da rotina ${routineCode}: ${errMsg}`
                    });
                    return;
                  }
                } catch {
                  // Se não for JSON, considera sucesso pelo status HTTP
                }
                resolve({
                  success: true,
                  message: `Rotina ${routineCode} iniciada com sucesso via WinThor Start.`
                });
              } else {
                resolve({
                  success: false,
                  error: 'WINTHOR_START_HTTP_ERROR',
                  message: `WinThor Start retornou HTTP ${res.statusCode} ao tentar abrir a rotina ${routineCode}.`
                });
              }
            });
          }
        );

        req.on('error', (err) => {
          console.warn(`[RoutinesService] Erro de conexão com Winthor Start: ${err.message}`);
          resolve({
            success: false,
            winthorStartOffline: true,
            error: 'WINTHOR_START_OFFLINE',
            message: `O serviço WinThor Start não está em execução na porta ${port} (${err.message}).`
          });
        });

        req.on('timeout', () => {
          console.warn(`[RoutinesService] Timeout ao aguardar resposta do Winthor Start.`);
          req.destroy();
          resolve({
            success: false,
            winthorStartOffline: false,
            error: 'WINTHOR_START_TIMEOUT',
            message: `Tempo limite esgotado ao aguardar resposta do serviço WinThor Start na porta ${port}.`
          });
        });

        req.write(postData);
        req.end();
      });
    } catch (err: any) {
      console.warn(`[RoutinesService] Falha ao acionar Winthor Start para rotina ${routineCode}:`, err);
      return {
        success: false,
        error: 'WINTHOR_START_EXCEPTION',
        message: err?.message || 'Falha ao acionar Winthor Start.'
      };
    }
  }

  public listRoutines(): RoutineItem[] {
    const settings = this.configService.getSettings();
    const basePath = settings.appPath;
    const routines: RoutineItem[] = [];
    if (!basePath) {
      return routines;
    }

    const extensions = (
      settings.routineFileExtensions && settings.routineFileExtensions.length > 0
        ? settings.routineFileExtensions
        : DEFAULT_ROUTINE_EXTENSIONS
    ).map((ext) => ext.toUpperCase());

    const prodDir = fs.existsSync(path.join(basePath, 'Prod'))
      ? path.join(basePath, 'Prod')
      : basePath;
    const favorites = new Set(settings.favoriteRoutines || []);

    if (!fs.existsSync(prodDir)) {
      return routines;
    }

    const scanDirectory = (dir: string, currentModule: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDirectory(fullPath, entry.name);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toUpperCase();
            if (extensions.includes(ext)) {
              const stat = fs.statSync(fullPath);
              const sizeMb = (stat.size / (1024 * 1024)).toFixed(1) + ' MB';
              const id = entry.name;

              let fileVersion: string | undefined;
              let productVersion: string | undefined;
              if (ext === '.EXE') {
                const verInfo = readExecutableVersion(fullPath);
                if (verInfo) {
                  fileVersion = verInfo.fileVersion;
                  productVersion = verInfo.productVersion;
                }
              }

              routines.push({
                id,
                name: entry.name,
                module: currentModule || 'Geral',
                fullPath,
                sizeMb,
                isFavorite: favorites.has(id),
                fileVersion,
                productVersion
              });
            }
          }
        }
      } catch (err) {
        console.error(`Erro ao escanear pasta ${dir}:`, err);
      }
    };

    scanDirectory(prodDir, 'Raiz');
    return routines.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public async launchRoutine(routinePath: string, forceDirect = false): Promise<RoutineLaunchResult> {
    try {
      console.log(`[RoutinesService] Solicitada abertura de rotina: "${routinePath}" (forceDirect: ${forceDirect})`);
      if (!routinePath || typeof routinePath !== 'string') {
        console.warn(`[RoutinesService] Caminho de rotina vazio ou inválido.`);
        return {
          success: false,
          error: 'INVALID_PATH',
          message: 'Caminho de rotina vazio ou inválido.'
        };
      }
      const settings = this.configService.getSettings();
      const basePath = settings.appPath;
      if (!basePath) {
        console.warn(`[RoutinesService] Diretório appPath não configurado nas Configurações.`);
        return {
          success: false,
          error: 'APP_PATH_NOT_CONFIGURED',
          message: 'Diretório de rotinas não configurado nas Configurações do sistema.'
        };
      }
      // Restringir a execução apenas a binários contidos na pasta de instalação configurada
      if (!isSafePath(routinePath, basePath)) {
        console.warn(`[Segurança] Bloqueada tentativa de executar binário fora da pasta configurada: ${routinePath} (base: ${basePath})`);
        return {
          success: false,
          error: 'SECURITY_BLOCKED',
          message: 'Tentativa de executar binário fora do diretório configurado foi bloqueada por segurança.'
        };
      }

      const normalizedPath = path.normalize(path.resolve(routinePath));
      if (!fs.existsSync(normalizedPath)) {
        console.warn(`[RoutinesService] Arquivo não encontrado no disco: ${normalizedPath}`);
        return {
          success: false,
          error: 'FILE_NOT_FOUND',
          message: `Arquivo executável não encontrado no disco: ${normalizedPath}`
        };
      }

      const dir = path.dirname(normalizedPath);
      const ext = path.extname(normalizedPath).toUpperCase();
      const launcherMap = settings.routineLauncherMap || {};
      const launcher = launcherMap[ext] || launcherMap[ext.toLowerCase()];

      if (launcher) {
        if (!fs.existsSync(launcher)) {
          console.warn(`[RoutinesService] Launcher configurado para ${ext} não encontrado: ${launcher}`);
          return {
            success: false,
            error: 'LAUNCHER_NOT_FOUND',
            message: `Launcher configurado para extensão ${ext} não encontrado: ${launcher}`
          };
        }
        launchProcessSafely(launcher, [normalizedPath], path.dirname(launcher));
        return {
          success: true,
          message: `Rotina iniciada através do launcher configurado: ${path.basename(launcher)}`
        };
      }

      // Se Winthor Start estiver habilitado (padrão true), tenta abrir via DataSnap REST autenticado
      const winthorStartEnabled = settings.winthorStartEnabled ?? true;
      const routineCode = extractRoutineCode(normalizedPath);
      if (shouldUseWinthorStart(winthorStartEnabled, routineCode) && !forceDirect) {
        const wsResult = await this.launchViaWinthorStart(routineCode!);
        if (wsResult.success) {
          return wsResult;
        }

        // Se a falha foi porque o Karaf está offline ou autenticação falhou, NÃO faz fallback silencioso!
        // O usuário PRECISA receber o motivo explícito da falta de autenticação no Karaf.
        if (wsResult.karafOffline || wsResult.authFailed) {
          return wsResult;
        }

        // Se o WinThor Start retornou erro funcional (ex: permissão do usuário negada):
        if (wsResult.error === 'WINTHOR_START_ERROR') {
          return wsResult;
        }

        // Se o WinThor Start demorou mas a porta está conectada (timeout), avisa o usuário sem colidir com execução concorrente:
        if (wsResult.error === 'WINTHOR_START_TIMEOUT') {
          return wsResult;
        }

        // Se o WinThor Start estiver offline (serviço não rodando localmente):
        console.info(`[RoutinesService] Winthor Start indisponível para rotina ${routineCode}. Executando fallback para execução direta.`);
      }

      launchProcessSafely(normalizedPath, [], dir);
      return {
        success: true,
        fallbackDirect: true,
        message: forceDirect
          ? `Rotina ${path.basename(normalizedPath)} executada diretamente (forçada sem autenticação).`
          : `Rotina ${path.basename(normalizedPath)} executada via inicialização direta.`
      };
    } catch (err: any) {
      console.error('Erro ao iniciar rotina:', err);
      return {
        success: false,
        error: 'UNEXPECTED_ERROR',
        message: err?.message || 'Erro inesperado ao iniciar a rotina.'
      };
    }
  }

  public launchMappedProgram(id: string): boolean {
    try {
      if (!id || typeof id !== 'string') return false;
      const settings = this.configService.getSettings();
      const program = (settings.mappedPrograms || []).find((p) => p.id === id);
      if (!program) return false;

      const normalizedPath = path.normalize(path.resolve(program.fullPath));
      if (!fs.existsSync(normalizedPath)) {
        console.warn(`[RoutinesService] Programa mapeado não encontrado no disco: ${normalizedPath}`);
        return false;
      }

      launchProcessSafely(normalizedPath, [], path.dirname(normalizedPath));
      return true;
    } catch (err) {
      console.error('Erro ao iniciar programa mapeado:', err);
      return false;
    }
  }

  /**
   * Retorna o link direto oficial de download da rotina na Central de Controle do WinThor.
   */
  public getCcwRoutineDownloadLink(routineCodeOrName: string, winthorVersion?: string): string {
    const settings = this.configService.getSettings();
    const normalized = normalizeRoutineTarget(routineCodeOrName);
    const version = winthorVersion || settings.ccwWinthorVersion || '30';
    return buildCcwDownloadUrl(settings.ccwBaseUrl, normalized.baseName, version);
  }

  /**
   * Baixa uma rotina diretamente da Central de Controle (CCW) e atualiza na pasta correspondente em C:\Winthor\Prod.
   * Suporta download por código/nome, descompactação de .ZIP ou .EXE direto, e backup automático (.bak).
   */
  public async downloadAndInstallRoutine(req: RoutineDownloadRequest): Promise<RoutineDownloadResult> {
    try {
      const settings = this.configService.getSettings();
      const basePath = settings.appPath;

      if (!basePath) {
        return {
          success: false,
          error: 'APP_PATH_NOT_CONFIGURED',
          message: 'Diretório base do WinThor (appPath) não configurado nas Configurações do sistema.'
        };
      }

      const normalized = normalizeRoutineTarget(req.routineCodeOrName);
      if (!normalized.baseName) {
        return {
          success: false,
          error: 'INVALID_ROUTINE_NAME',
          message: 'Código ou nome de rotina inválido informado.'
        };
      }

      const winthorVersion = req.winthorVersion || settings.ccwWinthorVersion || '30';
      const downloadUrl = req.customDownloadUrl && req.customDownloadUrl.trim()
        ? req.customDownloadUrl.trim()
        : buildCcwDownloadUrl(settings.ccwBaseUrl, normalized.baseName, winthorVersion);

      console.log(`[RoutinesService] Iniciando download da rotina ${normalized.baseName} de: ${downloadUrl}`);

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*'
      };

      const activeCookie = req.authCookie || settings.ccwAuthCookie;
      if (activeCookie) {
        const cleanCookie = activeCookie.trim();
        headers['Cookie'] = cleanCookie.startsWith('suukie=') || cleanCookie.includes('=')
          ? cleanCookie
          : `suukie=${cleanCookie}`;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout

      let res: Response;
      try {
        res = await fetch(downloadUrl, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        if (res.status === 404) {
          return {
            success: false,
            error: 'NOT_FOUND_IN_CCW',
            routineName: normalized.baseName,
            routineCode: normalized.code || undefined,
            winthorVersion,
            message: `A rotina ${normalized.baseName} não foi encontrada na versão ${winthorVersion} da Central de Controle (HTTP 404). Verifique se o código da rotina e a versão estão corretos.`
          };
        }
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            error: 'CCW_AUTH_REQUIRED',
            routineName: normalized.baseName,
            routineCode: normalized.code || undefined,
            winthorVersion,
            message: `Acesso negado pela Central de Controle ao tentar baixar a rotina ${normalized.baseName} (HTTP ${res.status}).`
          };
        }
        return {
          success: false,
          error: `HTTP_${res.status}`,
          routineName: normalized.baseName,
          routineCode: normalized.code || undefined,
          winthorVersion,
          message: `Central de Controle retornou erro HTTP ${res.status} (${res.statusText}) ao solicitar download.`
        };
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        return {
          success: false,
          error: 'EMPTY_DOWNLOAD',
          routineName: normalized.baseName,
          winthorVersion,
          message: `O download da rotina ${normalized.baseName} retornou um arquivo vazio.`
        };
      }

      return this.installRoutineBuffer(buffer, normalized, basePath, req.targetModule, req.backupExisting, winthorVersion);
    } catch (err: any) {
      console.error('[RoutinesService] Erro ao baixar rotina da CCW:', err);
      return {
        success: false,
        error: 'DOWNLOAD_FAILED',
        message: err?.message || 'Falha na conexão com a Central de Controle para download da rotina.'
      };
    }
  }

  /**
   * Instala uma rotina a partir de um arquivo local (.EXE ou .ZIP) previamente baixado.
   */
  public async installRoutineFromFile(
    sourceFilePath: string,
    routineCodeOrName?: string,
    targetModule?: string,
    backupExisting: boolean = true
  ): Promise<RoutineDownloadResult> {
    try {
      const settings = this.configService.getSettings();
      const basePath = settings.appPath;

      if (!basePath) {
        return {
          success: false,
          error: 'APP_PATH_NOT_CONFIGURED',
          message: 'Diretório base do WinThor (appPath) não configurado nas Configurações do sistema.'
        };
      }

      if (!sourceFilePath || !isSafeLocalPath(sourceFilePath) || !fs.existsSync(sourceFilePath)) {
        return {
          success: false,
          error: 'SOURCE_NOT_FOUND',
          message: `Arquivo de origem não encontrado: ${sourceFilePath}`
        };
      }

      const targetIdentifier = routineCodeOrName || path.basename(sourceFilePath);
      const normalized = normalizeRoutineTarget(targetIdentifier);
      const buffer = fs.readFileSync(sourceFilePath);

      return this.installRoutineBuffer(buffer, normalized, basePath, targetModule, backupExisting);
    } catch (err: any) {
      console.error('[RoutinesService] Erro ao instalar rotina a partir de arquivo local:', err);
      return {
        success: false,
        error: 'INSTALL_FAILED',
        message: err?.message || 'Falha ao instalar arquivo local da rotina.'
      };
    }
  }

  /**
   * Grava os arquivos da rotina no diretório correto de Prod, realizando backup da versão existente.
   */
  private installRoutineBuffer(
    buffer: Buffer,
    normalized: { code: string | null; baseName: string; fileName: string },
    basePath: string,
    targetModule?: string,
    backupExisting: boolean = true,
    winthorVersion?: string
  ): RoutineDownloadResult {
    const prodDir = fs.existsSync(path.join(basePath, 'Prod'))
      ? path.join(basePath, 'Prod')
      : basePath;

    const processed = processRoutineDownloadBuffer(buffer, normalized.fileName);
    const resolved = resolveTargetRoutineDirectory(prodDir, normalized.fileName, normalized.code, targetModule);
    const targetDir = resolved.targetDir;

    // Validação de segurança: garantir que targetDir esteja estritamente sob basePath
    if (!isSafePath(targetDir, basePath)) {
      console.warn(`[Segurança] Tentativa de gravar arquivo fora do appPath bloqueada: ${targetDir}`);
      return {
        success: false,
        error: 'SECURITY_BLOCKED',
        routineName: normalized.baseName,
        message: 'Caminho de destino da rotina bloqueado por diretrizes de segurança.'
      };
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let backupPath: string | undefined;
    const extractedFileNames: string[] = [];

    for (const file of processed.filesToWrite) {
      const destinationFile = path.join(targetDir, file.fileName);

      if (!isSafePath(destinationFile, basePath)) {
        continue;
      }

      // Se o arquivo já existe e o backup está ativado
      if (fs.existsSync(destinationFile) && backupExisting) {
        try {
          const bakPath = createBackupFilePath(destinationFile);
          fs.copyFileSync(destinationFile, bakPath);
          if (!backupPath) {
            backupPath = bakPath;
          }
          console.log(`[RoutinesService] Backup criado: ${bakPath}`);
        } catch (bkErr) {
          console.warn(`[RoutinesService] Falha ao criar backup de ${destinationFile}:`, bkErr);
        }
      }

      fs.writeFileSync(destinationFile, file.data);
      extractedFileNames.push(file.fileName);
      console.log(`[RoutinesService] Arquivo gravado com sucesso: ${destinationFile} (${(file.data.length / (1024 * 1024)).toFixed(2)} MB)`);
    }

    const mainInstalledPath = path.join(targetDir, normalized.fileName);
    return {
      success: true,
      message: `Rotina ${normalized.baseName} atualizada com sucesso em ${path.relative(basePath, targetDir) || 'Prod'}.`,
      routineName: normalized.baseName,
      routineCode: normalized.code || undefined,
      installedPath: mainInstalledPath,
      backupPath,
      fileSizeBytes: buffer.length,
      extractedFiles: extractedFileNames,
      winthorVersion
    };
  }

  /**
   * Consulta a árvore completa de rotinas disponibilizada pela Central de Controle (requer autenticação).
   */
  public async getCcwCatalog(customAuthCookie?: string): Promise<CcwCatalogResponse> {
    const settings = this.configService.getSettings();
    const baseUrl = (settings.ccwBaseUrl || 'https://centraldecontrole.pcinformatica.com.br').trim().replace(/\/+$/, '');
    const activeCookie = customAuthCookie || settings.ccwAuthCookie;

    if (!activeCookie) {
      return {
        success: false,
        authenticated: false,
        items: [],
        message: 'A consulta da árvore de rotinas requer o Cookie de Sessão da Central de Controle configurado nas Configurações. No entanto, você pode baixar e atualizar qualquer rotina diretamente informando seu código.'
      };
    }

    try {
      const cleanCookie = activeCookie.trim();
      const cookieHeader = cleanCookie.startsWith('suukie=') || cleanCookie.includes('=')
        ? cleanCookie
        : `suukie=${cleanCookie}`;

      const res = await fetch(`${baseUrl}/api/rotinas`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Cookie: cookieHeader
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        return {
          success: false,
          authenticated: false,
          items: [],
          error: `HTTP_${res.status}`,
          message: `Falha na autenticação com a Central de Controle (HTTP ${res.status}). Verifique o cookie configurado.`
        };
      }

      const data = await res.json().catch(() => null);
      if (!Array.isArray(data)) {
        return {
          success: false,
          authenticated: true,
          items: [],
          message: 'Formato de resposta inesperado retornado pela Central de Controle.'
        };
      }

      const items: CcwCatalogItem[] = data.map((item: any) => {
        const modNum = parseInt(item.modulo, 10) || 0;
        const rotina = item.rotina || '';
        const versaoCorrente = item.versaoCorrente?.versao;
        const versaoAnterior = item.versaoAnterior?.versao;
        const versaoNova = item.versaoNova?.versao;
        const downloadUrl = buildCcwDownloadUrl(baseUrl, rotina, versaoCorrente || '30');

        return {
          id: item.id || 0,
          rotina,
          modulo: modNum,
          moduloDesc: `MOD-${String(modNum).padStart(3, '0')}`,
          versaoCorrente,
          versaoAnterior,
          versaoNova,
          dataPublicacao: item.versaoCorrente?.data,
          downloadUrl
        };
      });

      return {
        success: true,
        authenticated: true,
        items
      };
    } catch (err: any) {
      console.warn('[RoutinesService] Falha ao consultar catálogo da CCW:', err?.message || err);
      return {
        success: false,
        authenticated: false,
        items: [],
        error: 'NETWORK_ERROR',
        message: err?.message || 'Erro ao conectar à Central de Controle.'
      };
    }
  }

  /**
   * Lê a versão e metadados de um executável PE no disco.
   */
  public getExecutableVersion(filePath: string): ExecutableVersionInfo | null {
    return readExecutableVersion(filePath);
  }

  /**
   * Lista todos os backups (.bak) de uma rotina específica no diretório do módulo correspondente em Prod.
   */
  public listRoutineBackups(routineIdOrName: string, moduleFolder?: string): RoutineBackupEntry[] {
    const settings = this.configService.getSettings();
    const basePath = settings.appPath;
    if (!basePath) return [];

    const prodDir = fs.existsSync(path.join(basePath, 'Prod'))
      ? path.join(basePath, 'Prod')
      : basePath;

    const normalized = normalizeRoutineTarget(routineIdOrName);
    if (!normalized.baseName) return [];

    const resolved = resolveTargetRoutineDirectory(prodDir, normalized.fileName, normalized.code, moduleFolder);
    const targetDir = resolved.targetDir;
    const backups: RoutineBackupEntry[] = [];

    // Pastas a escanear: a pasta da rotina e também a raiz de prod (caso haja backups antigos lá)
    const dirsToScan = new Set<string>();
    if (fs.existsSync(targetDir)) dirsToScan.add(targetDir);
    if (fs.existsSync(prodDir)) dirsToScan.add(prodDir);

    for (const dir of dirsToScan) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (isBackupForRoutine(file, normalized.baseName)) {
            const fullPath = path.join(dir, file);
            if (!isSafePath(fullPath, basePath)) continue;

            const stat = fs.statSync(fullPath);
            const parsed = parseBackupFileName(file);
            const versionInfo = readExecutableVersion(fullPath);

            const targetRoutinePath = path.join(dir, normalized.fileName);
            backups.push({
              fileName: file,
              fullPath,
              backupFilePath: fullPath,
              backupPath: fullPath,
              targetRoutinePath,
              targetPath: targetRoutinePath,
              routineName: normalized.baseName,
              sizeBytes: stat.size,
              sizeFormatted: formatBytes(stat.size),
              createdAt: (parsed.parsedDate || stat.mtime).toISOString(),
              timestampFormatted: formatBackupDate(parsed.parsedDate || stat.mtime),
              dateFormatted: formatBackupDate(parsed.parsedDate || stat.mtime),
              fileVersion: versionInfo?.fileVersion,
              productVersion: versionInfo?.productVersion,
              version: versionInfo ? { fileVersion: versionInfo.fileVersion, productVersion: versionInfo.productVersion } : undefined,
              isPreRollback: parsed.isPreRollback
            });
          }
        }
      } catch (err) {
        console.warn(`[RoutinesService] Erro ao escanear backups em ${dir}:`, err);
      }
    }

    // Ordena do mais recente para o mais antigo
    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Restaura uma versão anterior a partir de um arquivo .bak (Rollback),
   * criando preventivamente um backup de segurança da versão atual.
   */
  public restoreRoutineBackup(backupFilePath: string, targetRoutinePath: string): RoutineRollbackResult {
    try {
      const settings = this.configService.getSettings();
      const basePath = settings.appPath;
      if (!basePath) {
        return {
          success: false,
          error: 'APP_PATH_NOT_CONFIGURED',
          message: 'Diretório base do WinThor não configurado.',
          restoredFromBackup: backupFilePath,
          targetRoutinePath
        };
      }

      if (!backupFilePath || !isSafePath(backupFilePath, basePath) || !fs.existsSync(backupFilePath)) {
        return {
          success: false,
          error: 'BACKUP_NOT_FOUND',
          message: `Arquivo de backup não encontrado ou inválido: ${backupFilePath}`,
          restoredFromBackup: backupFilePath,
          targetRoutinePath
        };
      }

      if (!targetRoutinePath || !isSafePath(targetRoutinePath, basePath)) {
        return {
          success: false,
          error: 'INVALID_TARGET_PATH',
          message: `Caminho de destino da rotina inválido: ${targetRoutinePath}`,
          restoredFromBackup: backupFilePath,
          targetRoutinePath
        };
      }

      // 1. Criar backup preventivo da versão atual antes do rollback (se o destino existir)
      let preRollbackBackupPath: string | undefined;
      if (fs.existsSync(targetRoutinePath)) {
        try {
          preRollbackBackupPath = createPreRollbackBackupPath(targetRoutinePath);
          fs.copyFileSync(targetRoutinePath, preRollbackBackupPath);
          console.log(`[RoutinesService] Backup de segurança pré-rollback criado: ${preRollbackBackupPath}`);
        } catch (bkErr) {
          console.warn(`[RoutinesService] Falha ao criar backup pré-rollback:`, bkErr);
        }
      }

      // 2. Restaurar o arquivo copiando o backup sobre o executável de destino
      fs.copyFileSync(backupFilePath, targetRoutinePath);
      const restoredVersionInfo = readExecutableVersion(targetRoutinePath);
      const versionStr = restoredVersionInfo?.fileVersion ? ` (Versão ${restoredVersionInfo.fileVersion})` : '';

      console.log(`[RoutinesService] Rollback executado com sucesso: ${backupFilePath} -> ${targetRoutinePath}`);
      return {
        success: true,
        message: `Rollback realizado com sucesso para ${path.basename(targetRoutinePath)}${versionStr}.`,
        restoredFromBackup: backupFilePath,
        targetRoutinePath,
        preRollbackBackupPath,
        restoredVersion: restoredVersionInfo?.fileVersion
      };
    } catch (err: any) {
      console.error('[RoutinesService] Erro ao restaurar backup:', err);
      return {
        success: false,
        error: 'RESTORE_FAILED',
        message: err?.message || 'Falha ao restaurar versão de backup da rotina.',
        restoredFromBackup: backupFilePath,
        targetRoutinePath
      };
    }
  }

  /**
   * Exclui um arquivo de backup específico do disco.
   */
  public deleteRoutineBackup(backupFilePath: string): { success: boolean; message?: string } {
    try {
      const settings = this.configService.getSettings();
      const basePath = settings.appPath;
      if (!basePath) {
        return { success: false, message: 'appPath não configurado.' };
      }

      if (!backupFilePath || !isSafePath(backupFilePath, basePath) || !fs.existsSync(backupFilePath)) {
        return { success: false, message: 'Arquivo de backup não encontrado ou caminho não autorizado.' };
      }

      if (!backupFilePath.toLowerCase().endsWith('.bak')) {
        return { success: false, message: 'Apenas arquivos com extensão .bak podem ser excluídos.' };
      }

      fs.unlinkSync(backupFilePath);
      console.log(`[RoutinesService] Backup excluído: ${backupFilePath}`);
      return { success: true, message: 'Arquivo de backup excluído com sucesso.' };
    } catch (err: any) {
      console.error('[RoutinesService] Erro ao excluir backup:', err);
      return { success: false, message: err?.message || 'Falha ao excluir backup.' };
    }
  }

  /**
   * Executa download e atualização em lote de rotinas (todas as favoritas, módulo inteiro ou lista customizada).
   */
  public async downloadRoutinesBatch(
    request: BatchRoutineDownloadRequest,
    onProgress?: (progress: BatchRoutineItemProgress) => void
  ): Promise<BatchRoutineDownloadResult> {
    const startTime = Date.now();
    const settings = this.configService.getSettings();
    let targets: string[] = [];

    if (request.targetType === 'favorites') {
      targets = (settings.favoriteRoutines || []).map((id) => id.replace(/\.exe$/i, ''));
    } else if (request.targetType === 'module') {
      const moduleName = request.module || request.moduleFolder;
      const allRoutines = this.listRoutines();
      targets = allRoutines
        .filter((r) => !moduleName || r.module === moduleName)
        .map((r) => r.name.replace(/\.exe$/i, ''));
    } else if (request.targetType === 'custom') {
      const customList = request.routineCodesOrNames || request.routineCodes || [];
      targets = customList.map((s) => s.trim()).filter(Boolean);
    }

    // Deduplica lista
    const uniqueTargets = Array.from(new Set(targets));

    if (uniqueTargets.length === 0) {
      return {
        success: true,
        total: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        totalRoutines: 0,
        successfulDownloads: 0,
        failedDownloads: 0,
        results: [],
        durationMs: Date.now() - startTime,
        message: 'Nenhuma rotina encontrada para o escopo selecionado.'
      };
    }

    const results: BatchRoutineItemProgress[] = [];
    let completedCount = 0;
    let failedCount = 0;

    for (const target of uniqueTargets) {
      const normalized = normalizeRoutineTarget(target);
      onProgress?.({
        routine: target,
        routineCode: normalized.code || undefined,
        routineCodeOrName: target,
        status: 'downloading'
      });

      try {
        const downloadRes = await this.downloadAndInstallRoutine({
          routineCodeOrName: target,
          winthorVersion: request.winthorVersion,
          targetModule: request.module || request.moduleFolder,
          backupExisting: request.backupExisting !== false
        });

        if (downloadRes.success) {
          completedCount++;
          const versionInfo = downloadRes.installedPath ? readExecutableVersion(downloadRes.installedPath) : null;
          const itemProgress: BatchRoutineItemProgress = {
            routine: target,
            routineCode: downloadRes.routineCode,
            routineCodeOrName: target,
            status: 'completed',
            installedPath: downloadRes.installedPath,
            backupPath: downloadRes.backupPath,
            fileSizeBytes: downloadRes.fileSizeBytes,
            fileVersion: versionInfo?.fileVersion,
            message: downloadRes.message
          };
          results.push(itemProgress);
          onProgress?.(itemProgress);
        } else {
          failedCount++;
          const itemProgress: BatchRoutineItemProgress = {
            routine: target,
            routineCode: normalized.code || undefined,
            routineCodeOrName: target,
            status: 'failed',
            error: downloadRes.error,
            message: downloadRes.message
          };
          results.push(itemProgress);
          onProgress?.(itemProgress);
        }
      } catch (err: any) {
        failedCount++;
        const itemProgress: BatchRoutineItemProgress = {
          routine: target,
          routineCode: normalized.code || undefined,
          routineCodeOrName: target,
          status: 'failed',
          error: 'EXCEPTION',
          message: err?.message || 'Falha inesperada no download.'
        };
        results.push(itemProgress);
        onProgress?.(itemProgress);
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      success: failedCount === 0,
      total: uniqueTargets.length,
      totalRoutines: uniqueTargets.length,
      completed: completedCount,
      successfulDownloads: completedCount,
      failed: failedCount,
      failedDownloads: failedCount,
      skipped: 0,
      results,
      durationMs,
      message: `Processamento em lote finalizado: ${completedCount} atualizada(s), ${failedCount} falha(s) em ${(durationMs / 1000).toFixed(1)}s.`
    };
  }
}

