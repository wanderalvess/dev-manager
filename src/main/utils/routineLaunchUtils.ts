import { spawn } from 'child_process';
import path from 'path';
import { RoutineLaunchResult } from '../../shared/types';

/**
 * Executa um aplicativo ou rotina de forma segura e desacoplada no Windows e Linux.
 * No Windows, utiliza cmd.exe /c start para garantir o acionamento via ShellExecute,
 * que trata elevação UAC, scripts (.bat, .cmd), executáveis (.exe), caminhos com espaços
 * e evita o erro 'spawn EFTYPE' (ERROR_BAD_EXE_FORMAT) causado pelo spawn direto via CreateProcessW.
 */
export function launchProcessSafely(executablePath: string, args: string[] = [], cwd?: string): void {
  const dir = cwd || path.dirname(executablePath);
  if (process.platform === 'win32') {
    const cmdExe = process.env.ComSpec || process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
    const title = path.basename(executablePath);
    const child = spawn(cmdExe, ['/c', 'start', title, '/d', dir, executablePath, ...args], {
      cwd: dir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.on('error', (err) => {
      console.warn('[launchProcessSafely] Falha no spawn via cmd start, tentando fallback com shell: true:', err);
      try {
        spawn(executablePath, args, {
          cwd: dir,
          detached: true,
          stdio: 'ignore',
          shell: true
        }).unref();
      } catch (fallbackErr) {
        console.error('[launchProcessSafely] Falha definitiva ao disparar processo:', fallbackErr);
      }
    });
    child.unref();
  } else {
    const child = spawn(executablePath, args, {
      cwd: dir,
      detached: true,
      stdio: 'ignore'
    });
    child.on('error', (err) => {
      console.error('[launchProcessSafely] Erro ao disparar processo:', err);
    });
    child.unref();
  }
}

/**
 * Identifica se um erro lançado por requisições de rede indica que a porta/servidor está desligada ou inacessível.
 */
export function isConnectionRefusedError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as any;
  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.message, err.name);
    if (anyErr.code) parts.push(String(anyErr.code));
    if (anyErr.cause) {
      if (anyErr.cause instanceof Error) {
        parts.push(anyErr.cause.message, anyErr.cause.name);
        if ((anyErr.cause as any).code) parts.push(String((anyErr.cause as any).code));
      } else {
        parts.push(String(anyErr.cause));
      }
    }
  } else {
    parts.push(String(err));
  }
  const text = parts.join(' ');
  return (
    /ECONNREFUSED/i.test(text) ||
    /fetch failed/i.test(text) ||
    /ETIMEDOUT/i.test(text) ||
    /ENOTFOUND/i.test(text) ||
    /ECONNRESET/i.test(text) ||
    /conexão recusada/i.test(text) ||
    /timeout/i.test(text) ||
    /AbortError/i.test(text)
  );
}

export interface WinthorStartPayloadBuildResult {
  payload: Record<string, string>;
  hasValidParams: boolean;
  fromDefault: boolean;
}

/**
 * Constrói e valida o payload da sessão do WinThor Start a partir dos parâmetros obtidos do WTA
 * ou do JSON de fallback configurado pelo usuário.
 */
export function buildWinthorStartPayload(
  wtaParams?: Partial<Record<'m' | 'u' | 'p' | 't' | 's', string>>,
  defaultPayloadJson?: string
): WinthorStartPayloadBuildResult {
  const basePayload: Record<string, string> = {
    m: '',
    u: '',
    p: '',
    t: '',
    s: ''
  };

  if (wtaParams && typeof wtaParams === 'object') {
    basePayload.m = (wtaParams.m || '').trim();
    basePayload.u = (wtaParams.u || '').trim();
    basePayload.p = (wtaParams.p || '').trim();
    basePayload.t = (wtaParams.t || '').trim();
    basePayload.s = (wtaParams.s || '').trim();
  }

  const hasWtaParams = Boolean(
    basePayload.m && basePayload.u && basePayload.p && basePayload.t && basePayload.s
  );

  if (hasWtaParams) {
    return {
      payload: basePayload,
      hasValidParams: true,
      fromDefault: false
    };
  }

  // Tenta recorrer ao payload padrão configurado se disponível
  if (defaultPayloadJson && defaultPayloadJson.trim()) {
    try {
      const parsed = JSON.parse(defaultPayloadJson);
      if (parsed && typeof parsed === 'object') {
        const defaultPayload: Record<string, string> = {
          m: String(parsed.m || basePayload.m || '').trim(),
          u: String(parsed.u || basePayload.u || '').trim(),
          p: String(parsed.p || basePayload.p || '').trim(),
          t: String(parsed.t || basePayload.t || '').trim(),
          s: String(parsed.s || basePayload.s || '').trim()
        };

        const hasValidDefault = Boolean(
          defaultPayload.m && defaultPayload.u && defaultPayload.p && defaultPayload.t && defaultPayload.s
        );

        if (hasValidDefault) {
          return {
            payload: defaultPayload,
            hasValidParams: true,
            fromDefault: true
          };
        }
      }
    } catch {
      // Ignora erro de JSON e mantém payload base
    }
  }

  return {
    payload: basePayload,
    hasValidParams: false,
    fromDefault: false
  };
}

/**
 * Determina se a execução deve ser despachada para o WinThor Start.
 */
export function shouldUseWinthorStart(
  winthorStartEnabled: boolean | undefined,
  routineCode: string | null
): boolean {
  const isEnabled = winthorStartEnabled ?? true;
  return isEnabled && Boolean(routineCode && routineCode.trim().length > 0);
}

/**
 * Formata mensagens de erro ricas e amigáveis para exibição de falhas de inicialização de rotinas.
 */
export function formatRoutineLaunchErrorMessage(
  result: RoutineLaunchResult,
  routineIdentifier: string,
  wtaUrl: string = 'http://localhost:8889'
): { title: string; message: string; isKarafOffline: boolean } {
  if (result.karafOffline) {
    return {
      title: `Apache Karaf não está em execução (Rotina ${routineIdentifier})`,
      message: `Não foi possível autenticar a rotina: o servidor Apache Karaf / WTA (${wtaUrl}) não está em execução ou não respondeu na porta 8889. O WinThor Start precisa do Karaf ativo para autenticar a sessão do usuário. Inicie o Karaf no Ambiente Dev antes de executar a rotina.`,
      isKarafOffline: true
    };
  }

  if (result.authFailed) {
    return {
      title: `Falha de autenticação no WinThor Anywhere (Rotina ${routineIdentifier})`,
      message: `O Apache Karaf está ativo em ${wtaUrl}, mas a autenticação da sessão foi recusada. Verifique se o usuário e senha do WTA nas Configurações estão corretos.`,
      isKarafOffline: false
    };
  }

  if (result.winthorStartOffline) {
    return {
      title: `Serviço WinThor Start não encontrado (Rotina ${routineIdentifier})`,
      message: result.message || `O serviço WinThor Start (DataSnap) não está respondendo na porta local. Verifique se o serviço está ativo no Windows.`,
      isKarafOffline: false
    };
  }

  return {
    title: `Falha ao abrir rotina (${routineIdentifier})`,
    message: result.message || 'Erro inesperado ao disparar a rotina. Verifique se o caminho existe e se os serviços estão ativos.',
    isKarafOffline: false
  };
}
