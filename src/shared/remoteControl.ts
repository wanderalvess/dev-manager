/**
 * Regras puras do controle remoto pelo celular (sem Node nem Electron), compartilhadas entre o
 * servidor da rede local, a tela de Configurações e os testes. O celular manda o NOME de uma ação,
 * nunca um comando: só entra o que está nesta lista fechada.
 */

export type RemoteActionId =
  | 'ambiente.preparar'
  | 'karaf.iniciar'
  | 'karaf.parar'
  | 'karaf.debug'
  | 'ide.abrir'
  | 'docker.iniciar'
  | 'docker.parar'
  | 'docker.reiniciar'
  | 'deploy.executar'
  | 'banco.backup';

export interface RemoteActionDef {
  /** Pede confirmação no celular e só roda com `confirmado: true`. */
  destructive: boolean;
  /** Exige `alvo` (id de container, de perfil de deploy ou de conexão de banco). */
  needsTarget: boolean;
  /** Demora (pipeline, deploy, backup): responde na hora e o andamento aparece no estado. */
  background: boolean;
}

export const REMOTE_ACTIONS: Readonly<Record<RemoteActionId, RemoteActionDef>> = {
  'ambiente.preparar': { destructive: true, needsTarget: false, background: true },
  'karaf.iniciar': { destructive: false, needsTarget: false, background: false },
  'karaf.parar': { destructive: true, needsTarget: false, background: false },
  'karaf.debug': { destructive: false, needsTarget: false, background: false },
  'ide.abrir': { destructive: false, needsTarget: false, background: false },
  'docker.iniciar': { destructive: false, needsTarget: true, background: false },
  'docker.parar': { destructive: true, needsTarget: true, background: false },
  'docker.reiniciar': { destructive: true, needsTarget: true, background: false },
  'deploy.executar': { destructive: true, needsTarget: true, background: true },
  'banco.backup': { destructive: true, needsTarget: true, background: true }
};

export interface RemoteActionRequest {
  action: RemoteActionId;
  target?: string;
  confirmed: boolean;
}

export type ParsedRemoteAction = { ok: true; request: RemoteActionRequest } | { ok: false; error: string };

const MAX_TARGET_LENGTH = 200;

/** Confere o corpo do POST: `hasOwnProperty` impede que `constructor`/`__proto__` passem como ação. */
export function parseRemoteAction(body: unknown): ParsedRemoteAction {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Pedido inválido.' };
  const raw = body as Record<string, unknown>;
  const action = raw.acao;
  if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(REMOTE_ACTIONS, action)) {
    return { ok: false, error: 'Ação desconhecida.' };
  }
  const def = REMOTE_ACTIONS[action as RemoteActionId];
  const target = raw.alvo;
  if (target !== undefined && (typeof target !== 'string' || target.length === 0 || target.length > MAX_TARGET_LENGTH)) {
    return { ok: false, error: 'Alvo inválido.' };
  }
  if (def.needsTarget && target === undefined) return { ok: false, error: 'Esta ação precisa de um alvo.' };
  const confirmed = raw.confirmado === true;
  if (def.destructive && !confirmed) return { ok: false, error: 'Esta ação precisa de confirmação.' };
  return { ok: true, request: { action: action as RemoteActionId, target: def.needsTarget ? (target as string) : undefined, confirmed } };
}

function ipv4Parts(ip: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((p) => p <= 255) ? parts : null;
}

/**
 * Só aceita quem vem da rede local: privados 10/8, 172.16/12, 192.168/16, link-local, loopback e o
 * 100.64/10 do Tailscale. PC com IP público ou porta aberta no roteador não vira porta de entrada.
 */
export function isPrivateAddress(address: string | undefined): boolean {
  if (!address) return false;
  const ip = address.startsWith('::ffff:') ? address.slice(7) : address;
  const v4 = ipv4Parts(ip);
  if (v4) {
    const [a, b] = v4;
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const lower = ip.toLowerCase();
  return lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd');
}

/**
 * O cabeçalho Host tem que ser um IP ou localhost (contra DNS rebinding: um site aberto no celular
 * não consegue falar com o servidor por um nome inventado).
 */
export function isAllowedHostHeader(host: string | undefined): boolean {
  if (!host) return false;
  const name = host.startsWith('[') ? host.slice(1, host.indexOf(']')) : host.replace(/:\d+$/, '');
  if (name === 'localhost') return true;
  return ipv4Parts(name) !== null || name.includes(':');
}

export interface RemoteControlStatus {
  /** Falso no modo Web/Docker e quando o app não está rodando como desktop. */
  supported: boolean;
  running: boolean;
  port?: number;
  /** Endereços de acesso (um por placa de rede local), já com a chave. */
  urls: string[];
  /** QR (data URL PNG) do primeiro endereço. */
  qrDataUrl?: string;
  error?: string;
}

export const EMPTY_REMOTE_STATUS: RemoteControlStatus = { supported: false, running: false, urls: [] };
