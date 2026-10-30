import type { AuthLockoutLogEntry } from '../../../shared/authLockoutTypes';
import type { AppSettings } from '../../../shared/types';
import { httpRequest } from '../../utils/httpRequest';
import { encodeWtaPassword } from '../authLockout/wtaPassword';

export type RunnerSettings = Partial<Pick<AppSettings, 'wtaUrl' | 'wtaLogin' | 'wtaPassword' | 'wtaAuthToken' | 'karafPath'>>;
export type Note = (message: string, level?: AuthLockoutLogEntry['level']) => void;

export const REQUEST_TIMEOUT_MS = 30_000;

export function normalizeWtaUrl(raw: string | undefined): string {
  let url = (raw || 'http://localhost:8889').trim();
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

export function safeParse(text: string): any {
  try {
    return text.trim() ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

/** Token do WTA pelo login de Configurações (senha em MD5); sem login, o token salvo. Senha e token vão para `secrets`. */
export async function wtaToken(settings: RunnerSettings, note: Note, secrets: string[]): Promise<string | undefined> {
  const login = settings.wtaLogin?.trim();
  const password = settings.wtaPassword;
  if (login && password) {
    note(`Entrando no WTA com o login de Configurações (${login}) para obter o token.`);
    const loginUrl = `${normalizeWtaUrl(settings.wtaUrl)}/winthor/autenticacao/v1/login`;
    const senha = encodeWtaPassword(password);
    secrets.push(password, senha);
    try {
      const res = await httpRequest(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ login, senha }),
        timeout: REQUEST_TIMEOUT_MS
      });
      const token = safeParse(await res.text())?.accessToken;
      if (res.ok && typeof token === 'string' && token) {
        secrets.push(token);
        note('Login no WTA aceito: o token vai no cabeçalho Authorization e no cookie suukie.');
        return token;
      }
      note(`Login no WTA recusado (HTTP ${res.status}).`, 'error');
    } catch (err: any) {
      note(`Login no WTA sem resposta: ${err?.message ?? 'erro de conexão'}.`, 'error');
    }
  }
  const saved = settings.wtaAuthToken?.trim().replace(/^suukie=/, '');
  if (saved) {
    secrets.push(saved);
    note('Usando o token do WTA salvo em Configurações.');
    return saved;
  }
  return undefined;
}
