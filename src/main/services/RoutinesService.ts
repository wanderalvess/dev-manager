import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { RoutineItem, RoutineLaunchResult, KarafWtaStatusResult } from '../../shared/types';
import { ConfigService } from './ConfigService';
import { isSafePath } from '../utils/security';
import {
  isConnectionRefusedError,
  buildWinthorStartPayload,
  shouldUseWinthorStart
} from '../utils/routineLaunchUtils';

const DEFAULT_ROUTINE_EXTENSIONS = ['.EXE'];

/**
 * Extrai o código numérico da rotina a partir do nome do executável.
 * Exemplos:
 *  - "PCSIS132.EXE" -> "132"
 *  - "132.EXE" -> "132"
 *  - "ROTINA529.EXE" -> "529"
 *  - "PCSIS1203.exe" -> "1203"
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

  // Prefixo de rotina genérico seguido por números (ex: ROTINA132, ROT_132)
  const genericMatch = baseName.match(/^(?:ROTINA|ROT|SIS)[_ -]?(\d+)$/i);
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
        signal: AbortSignal.timeout(3500)
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
            const cookieVal = activeToken.trim().startsWith('suukie=')
              ? activeToken.trim()
              : `suukie=${activeToken.trim()}`;
            headers['Cookie'] = cookieVal;
          }

          const res = await fetch(fetchUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(2500)
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
            timeout: 3000
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
            winthorStartOffline: true,
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

              routines.push({
                id,
                name: entry.name,
                module: currentModule || 'Geral',
                fullPath,
                sizeMb,
                isFavorite: favorites.has(id)
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
        spawn(launcher, [normalizedPath], {
          cwd: path.dirname(launcher),
          detached: true,
          stdio: 'ignore'
        }).unref();
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

        // Se o WinThor Start estiver offline (serviço não rodando localmente):
        console.info(`[RoutinesService] Winthor Start indisponível para rotina ${routineCode}. Executando fallback para execução direta.`);
      }

      spawn(normalizedPath, [], {
        cwd: dir,
        detached: true,
        stdio: 'ignore'
      }).unref();
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

      spawn(normalizedPath, [], {
        cwd: path.dirname(normalizedPath),
        detached: true,
        stdio: 'ignore'
      }).unref();
      return true;
    } catch (err) {
      console.error('Erro ao iniciar programa mapeado:', err);
      return false;
    }
  }
}
