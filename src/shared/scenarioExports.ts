import type { AuthLockoutCheckResult, AuthLockoutLogEntry } from './authLockoutTypes';
import { AUTH_LOCKOUT_STATUS_LABELS } from './authLockoutReport';

/**
 * Textos que os botões de copiar e baixar da Validação de Cenários produzem. Tudo aqui sai de resultados que os
 * services já mascararam; o cURL ainda troca qualquer credencial por um marcador, porque vai parar no chat do time.
 */

export const TOKEN_PLACEHOLDER = '<TOKEN_DO_WTA>';

const time = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toTimeString().slice(0, 8);
};

/** Passo a passo em texto, como está na tela: sem as requisições quando o filtro está desligado. */
export function activityToText(entries: readonly AuthLockoutLogEntry[], includeRequests = true): string {
  return entries
    .filter((e) => includeRequests || (e.level !== 'attempt' && e.level !== 'wait'))
    .flatMap((e) => {
      const line = `${time(e.at)} ${e.message}`.trim();
      return e.detail ? [line, `    ${e.detail}`] : [line];
    })
    .join('\n');
}

export function evidenceToText(check: AuthLockoutCheckResult): string {
  const lines = [`${check.title} — ${AUTH_LOCKOUT_STATUS_LABELS[check.status]}: ${check.summary}`];
  if (check.plan) lines.push('', `Como foi testado: ${check.plan}`);
  if (check.evidence.length) lines.push('', 'Evidências:', ...check.evidence.map((e) => `- ${e}`));
  return lines.join('\n');
}

const CREDENTIAL_HEADER = /^(authorization|proxy-authorization|cookie)$/i;
const quote = (text: string) => `'${text.replace(/'/g, `'\\''`)}'`;

/** Credencial nunca sai no cURL: Authorization vira Bearer <TOKEN_DO_WTA> e o cookie suukie=<TOKEN_DO_WTA>. */
export function safeCurlHeaderValue(name: string, value: string): string {
  if (!CREDENTIAL_HEADER.test(name)) return value;
  if (/^cookie$/i.test(name)) return `suukie=${TOKEN_PLACEHOLDER}`;
  return /^bearer\s/i.test(value) ? `Bearer ${TOKEN_PLACEHOLDER}` : TOKEN_PLACEHOLDER;
}

export interface CurlRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export function buildCurl(request: CurlRequest): string {
  const parts = [`curl -X ${request.method} ${quote(request.url)}`];
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    parts.push(`  -H ${quote(`${name}: ${safeCurlHeaderValue(name, value)}`)}`);
  }
  if (request.body) parts.push(`  -d ${quote(request.body)}`);
  return parts.join(' \\\n');
}

export function headersToText(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n');
}

/** "bloqueio-de-login-wand-rod-2026-10-30-1042.md": sem acento, espaço nem caractere que o Windows recuse. */
export function reportFileName(name: string, startedAt: string): string {
  const slug =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'cenario';
  const d = new Date(startedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = Number.isNaN(d.getTime())
    ? 'sem-data'
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${slug}-${stamp}.md`;
}
