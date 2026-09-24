import { RoutineLaunchResult } from '../../shared/types';

/**
 * Identifica se um erro lançado por requisições de rede indica que a porta/servidor está desligada ou inacessível.
 */
export function isConnectionRefusedError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? `${err.message} ${err.stack || ''} ${String((err as any).cause || '')}` : String(err);
  return (
    /ECONNREFUSED/i.test(msg) ||
    /fetch failed/i.test(msg) ||
    /ETIMEDOUT/i.test(msg) ||
    /ENOTFOUND/i.test(msg) ||
    /ECONNRESET/i.test(msg) ||
    /conexão recusada/i.test(msg) ||
    /timeout/i.test(msg) ||
    /AbortError/i.test(msg)
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
