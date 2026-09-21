import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { RoutineItem } from '../../shared/types';
import { ConfigService } from './ConfigService';
import { isSafePath } from '../utils/security';

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
   * Tenta disparar a rotina através do serviço Winthor Start (DataSnap REST na porta 9195).
   */
  public async launchViaWinthorStart(routineCode: string): Promise<boolean> {
    let settings = this.configService.getSettings();
    const port = settings.winthorStartPort || 9195;
    const wtaUrl = settings.wtaUrl || 'http://localhost:8889';

    try {
      // 1. Tentar obter parâmetros de launch autenticados do WTA (se disponível)
      let payload: Record<string, string> = {
        m: '',
        u: '',
        p: '',
        t: '',
        s: ''
      };

      const fetchParamsFromWta = async (token?: string): Promise<boolean> => {
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
            const data = await res.json();
            if (data && typeof data === 'object' && data.m && data.u) {
              payload = {
                m: data.m || '',
                u: data.u || '',
                p: data.p || '',
                t: data.t || '',
                s: data.s || ''
              };
              return true;
            }
          }
        } catch {
          // Ignora para tentar login automático
        }
        return false;
      };

      let gotParams = await fetchParamsFromWta();

      // Se falhou e temos credenciais configuradas, tenta renovar a sessão via login
      if (!gotParams && settings.wtaLogin && settings.wtaPassword) {
        const freshToken = await this.loginWta();
        if (freshToken) {
          settings = this.configService.getSettings();
          gotParams = await fetchParamsFromWta(freshToken);
        }
      }

      // Se o WTA não retornou os parâmetros obrigatórios, utiliza o payload de sessão padrão pré-configurado
      const hasWtaParams = Boolean(payload.m && payload.u && payload.p && payload.t && payload.s);
      if (!hasWtaParams && settings.winthorStartDefaultPayload) {
        try {
          const parsed = JSON.parse(settings.winthorStartDefaultPayload);
          if (parsed && typeof parsed === 'object') {
            payload = {
              m: parsed.m || payload.m,
              u: parsed.u || payload.u,
              p: parsed.p || payload.p,
              t: parsed.t || payload.t,
              s: parsed.s || payload.s
            };
            console.log(`[RoutinesService] Utilizando payload de sessão pré-configurado para a rotina ${routineCode}.`);
          }
        } catch (parseErr) {
          console.warn(`[RoutinesService] Erro ao interpretar winthorStartDefaultPayload como JSON:`, parseErr);
        }
      }

      // 2. Disparar Winthor Start via DataSnap REST
      console.log(`[RoutinesService] Enviando POST para Winthor Start: http://localhost:${port}/datasnap/rest/TServicos/AbrirRotina/${routineCode}`);
      console.log(`[RoutinesService] Payload:`, JSON.stringify(payload));

      return await new Promise<boolean>((resolve) => {
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
                    console.warn(`[RoutinesService] Winthor Start retornou erro funcional: ${bodyJson.msg}`);
                    resolve(false);
                    return;
                  }
                } catch {
                  // Se não for JSON, considera sucesso pelo status HTTP
                }
                resolve(true);
              } else {
                resolve(false);
              }
            });
          }
        );

        req.on('error', (err) => {
          console.warn(`[RoutinesService] Erro de conexão com Winthor Start: ${err.message}`);
          resolve(false);
        });

        req.on('timeout', () => {
          console.warn(`[RoutinesService] Timeout ao aguardar resposta do Winthor Start.`);
          req.destroy();
          resolve(false);
        });

        req.write(postData);
        req.end();
      });
    } catch (err) {
      console.warn(`[RoutinesService] Falha ao acionar Winthor Start para rotina ${routineCode}:`, err);
      return false;
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

  public async launchRoutine(routinePath: string): Promise<boolean> {
    try {
      console.log(`[RoutinesService] Solicitada abertura de rotina: "${routinePath}"`);
      if (!routinePath || typeof routinePath !== 'string') {
        console.warn(`[RoutinesService] Caminho de rotina vazio ou inválido.`);
        return false;
      }
      const settings = this.configService.getSettings();
      const basePath = settings.appPath;
      if (!basePath) {
        console.warn(`[RoutinesService] Diretório appPath não configurado nas Configurações.`);
        return false;
      }
      // Restringir a execução apenas a binários contidos na pasta de instalação configurada
      if (!isSafePath(routinePath, basePath)) {
        console.warn(`[Segurança] Bloqueada tentativa de executar binário fora da pasta configurada: ${routinePath} (base: ${basePath})`);
        return false;
      }

      const normalizedPath = path.normalize(path.resolve(routinePath));
      if (!fs.existsSync(normalizedPath)) {
        console.warn(`[RoutinesService] Arquivo não encontrado no disco: ${normalizedPath}`);
        return false;
      }

      const dir = path.dirname(normalizedPath);
      const ext = path.extname(normalizedPath).toUpperCase();
      const launcherMap = settings.routineLauncherMap || {};
      const launcher = launcherMap[ext] || launcherMap[ext.toLowerCase()];

      if (launcher) {
        if (!fs.existsSync(launcher)) {
          console.warn(`[RoutinesService] Launcher configurado para ${ext} não encontrado: ${launcher}`);
          return false;
        }
        spawn(launcher, [normalizedPath], {
          cwd: path.dirname(launcher),
          detached: true,
          stdio: 'ignore'
        }).unref();
        return true;
      }

      // Se Winthor Start estiver habilitado (padrão true), tenta abrir via DataSnap REST
      const winthorStartEnabled = settings.winthorStartEnabled ?? true;
      const routineCode = extractRoutineCode(normalizedPath);
      if (winthorStartEnabled && routineCode) {
        const launched = await this.launchViaWinthorStart(routineCode);
        if (launched) {
          return true;
        }
        console.info(`[RoutinesService] Winthor Start indisponível ou recusou a chamada para rotina ${routineCode}. Executando fallback para execução direta.`);
      }

      spawn(normalizedPath, [], {
        cwd: dir,
        detached: true,
        stdio: 'ignore'
      }).unref();
      return true;
    } catch (err) {
      console.error('Erro ao iniciar rotina:', err);
      return false;
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
