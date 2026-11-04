/**
 * Validação depois da criação (Assistente INFR → Verificar ambiente): além de "os três rodando e o WTA responde na
 * raiz", confere o que faz o ambiente funcionar de fato. Banco aberto, WTA ligado depois do banco, Karaf sem bundle
 * travado, rota de login registrada e o WSH achando as rotas do WTA. Cada ponto diz o que fazer, e o que o Hub resolve
 * sozinho (ligar o banco, reiniciar o WTA) vem com o botão.
 */
import { stuckBundles, type InfrContainerCheck, type InfrEnvCheck, type InfrRole } from './infrEnvCheck';

export type InfrPostStatus = 'ok' | 'warn' | 'fail' | 'wait';

/** Correção que a tela oferece num botão: o Hub roda `docker start` ou `docker restart` no container. */
export interface InfrPostFix {
  role: InfrRole;
  action: 'start' | 'restart';
  label: string;
}

export interface InfrPostItem {
  id: 'banco' | 'ordem' | 'karaf' | 'login' | 'wsh';
  status: InfrPostStatus;
  title: string;
  detail: string;
  fix?: InfrPostFix;
}

/** Resposta da rota de login do WTA (sem credencial): 404 é rota que o Karaf ainda não registrou. */
export type InfrHttpProbe = { url: string; status?: number; error?: string };

/** Rota que o Hub testa para saber se a autenticação do WinThor subiu. */
export const WTA_LOGIN_PATH = '/winthor/autenticacao/v1/login';

/** Minutos que o Karaf costuma levar para registrar as rotas depois de ligar: antes disso, 404 é "ainda subindo". */
const KARAF_BOOT_MINUTES = 10;

/** WTA e banco ligados com menos que isto de diferença ligaram juntos (a distro voltando), não um antes do outro. */
const ORDER_TOLERANCE_MS = 2 * 60000;

const RESTART_WTA: InfrPostFix = { role: 'wta', action: 'restart', label: 'Reiniciar o WTA' };

const hhmm = (iso?: string) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '?';
};

const minutesUp = (c: InfrContainerCheck | undefined, now: Date) => {
  const t = c?.startedAt ? Date.parse(c.startedAt) : NaN;
  return Number.isFinite(t) ? (now.getTime() - t) / 60000 : Infinity;
};

const isUp = (c: InfrContainerCheck | undefined) => !!c?.exists && c.state === 'running';

/** Serviços que o WSH chamou no WTA e voltaram 404, pelo fim do log (`[Servico: WTA - X] - Erro 'Client' na chamada da API:404`). */
export function wshMissingRoutes(c: InfrContainerCheck | undefined): string[] {
  const names = new Set<string>();
  for (const line of c?.logTail ?? []) {
    const m = /\[Servico: (?:WTA - )?([^\]]+)\][^\n]*API:404/.exec(line);
    if (m) names.add(m[1].trim());
  }
  return [...names];
}

/** O WSH não alcança o WTA (conexão recusada, nome que não resolve, tempo esgotado). */
function wshCannotReach(c: InfrContainerCheck | undefined): string | undefined {
  const line = (c?.logTail ?? []).find((l) => /Connection refused|UnknownHostException|connect timed out|I\/O error on (GET|POST)/i.test(l));
  return line ? (/(Connection refused|UnknownHostException[^\s]*|connect timed out|I\/O error on (GET|POST))/i.exec(line)?.[1] ?? 'erro de conexão') : undefined;
}

export function postChecks(containers: InfrContainerCheck[], wtaHttp: InfrHttpProbe | undefined, wtaLogin: InfrHttpProbe | undefined, now = new Date()): InfrPostItem[] {
  const by = (role: InfrRole) => containers.find((c) => c.role === role);
  const oracle = by('oracle');
  const wta = by('wta');
  const wsh = by('wsh');
  if (!oracle?.exists && !wta?.exists) return [];
  const items: InfrPostItem[] = [];

  // Banco: sem ele aberto nada mais funciona
  if (!oracle?.exists) items.push({ id: 'banco', status: 'wait', title: 'Banco ainda não criado', detail: `O container ${oracle?.container ?? 'do banco'} não existe.` });
  else if (oracle.state !== 'running')
    items.push({
      id: 'banco',
      status: 'fail',
      title: 'Banco parado',
      detail: `${oracle.container} está ${oracle.state ?? 'parado'}. O WTA e o WSH não funcionam sem ele. Ligue o banco e, quando ele abrir, reinicie o WTA.`,
      fix: { role: 'oracle', action: 'start', label: 'Ligar o banco' }
    });
  else if (oracle.health === 'unhealthy') items.push({ id: 'banco', status: 'fail', title: 'Banco com problema', detail: `${oracle.container} está rodando mas o healthcheck falha. Veja o log do banco.` });
  else if (oracle.health === 'starting') items.push({ id: 'banco', status: 'wait', title: 'Banco abrindo', detail: `${oracle.container} ligou às ${hhmm(oracle.startedAt)} e ainda está abrindo o banco.` });
  else items.push({ id: 'banco', status: 'ok', title: 'Banco aberto', detail: `${oracle.container} rodando${oracle.health ? ` (${oracle.health})` : ''} desde ${hhmm(oracle.startedAt)}.` });

  if (!isUp(wta)) {
    items.push({ id: 'karaf', status: wta?.exists ? 'fail' : 'wait', title: wta?.exists ? 'WTA parado' : 'WTA ainda não criado', detail: wta?.exists ? `${wta.container} está ${wta.state}.` : `O container ${wta?.container ?? 'do WTA'} não existe.`, ...(wta?.exists ? { fix: { role: 'wta', action: 'start', label: 'Ligar o WTA' } as InfrPostFix } : {}) });
    return items;
  }

  // Ordem: o WTA que liga antes do banco abrir fica com os serviços que leem o banco travados (Nathan, homolog). Os dois
  // ligando juntos (a distro voltando) não contam, e só é problema se algo travou: com tudo de pé a ordem não importa
  const stuck = stuckBundles(wta!);
  const booting = minutesUp(wta, now) < KARAF_BOOT_MINUTES;
  const hurt = stuck.length > 0 || (wtaLogin?.status === 404 && !booting) || (!booting && wshMissingRoutes(wsh).length > 0);
  const wtaAt = wta?.startedAt ? Date.parse(wta.startedAt) : NaN;
  const dbAt = oracle?.startedAt ? Date.parse(oracle.startedAt) : NaN;
  if (isUp(oracle) && Number.isFinite(wtaAt) && Number.isFinite(dbAt)) {
    items.push(
      dbAt - wtaAt > ORDER_TOLERANCE_MS && hurt
        ? {
            id: 'ordem',
            status: 'fail',
            title: 'O WTA subiu antes do banco',
            detail: `O WTA ligou às ${hhmm(wta!.startedAt)} e o banco só às ${hhmm(oracle!.startedAt)}. Os serviços que leem o banco estouram o tempo e não tentam de novo sozinhos: reinicie o WTA com o banco aberto.`,
            fix: RESTART_WTA
          }
        : {
            id: 'ordem',
            status: 'ok',
            title: wtaAt >= dbAt ? 'WTA ligado depois do banco' : 'Ordem de subida sem efeito',
            detail: `Banco às ${hhmm(oracle!.startedAt)}, WTA às ${hhmm(wta!.startedAt)}${wtaAt < dbAt ? '; nada travou por isso' : ''}.`
          }
    );
  }

  // Karaf: bundle que estourou o tempo trava a subida, mesmo com a raiz respondendo
  if (stuck.length)
    items.push({
      id: 'karaf',
      status: 'fail',
      title: 'Karaf com bundles travados',
      detail: `${stuck.slice(0, 4).join(', ')}${stuck.length > 4 ? ` e mais ${stuck.length - 4}` : ''} estouraram o tempo esperando outros serviços. Reinicie o WTA; se voltar a travar, falta uma feature de que eles dependem.`,
      fix: RESTART_WTA
    });
  else if (wtaHttp?.status && wtaHttp.status < 500) items.push({ id: 'karaf', status: 'ok', title: 'WTA respondendo', detail: `${wtaHttp.url} respondeu HTTP ${wtaHttp.status}, sem bundle travado.` });
  else items.push({ id: 'karaf', status: 'wait', title: 'WTA subindo', detail: `${wtaHttp?.url ?? 'O WTA'} ainda não responde${wtaHttp?.error ? ` (${wtaHttp.error})` : ''}. O Karaf leva alguns minutos.` });

  // Login: a rota da autenticação registrada é o sinal de que o WinThor está usável
  if (wtaLogin?.status === 404)
    items.push(
      booting
        ? { id: 'login', status: 'wait', title: 'Login ainda não registrado', detail: `${wtaLogin.url} ainda dá 404: o Karaf não terminou de subir a autenticação.` }
        : { id: 'login', status: 'fail', title: 'Login do WinThor não subiu', detail: `${wtaLogin.url} dá 404 com o WTA ligado há mais de ${KARAF_BOOT_MINUTES} minutos. Reinicie o WTA; se continuar, veja o log do WTA.`, fix: RESTART_WTA }
    );
  else if (wtaLogin?.status && wtaLogin.status < 500) items.push({ id: 'login', status: 'ok', title: 'Login do WinThor registrado', detail: `${wtaLogin.url} respondeu HTTP ${wtaLogin.status}.` });
  else if (wtaLogin) items.push({ id: 'login', status: 'wait', title: 'Login ainda não responde', detail: `${wtaLogin.url}: ${wtaLogin.status ? `HTTP ${wtaLogin.status}` : wtaLogin.error ?? 'sem resposta'}.` });

  // WSH: opcional, mas se existe precisa achar o WTA e as rotas que usa
  if (wsh?.exists) {
    const routes = wshMissingRoutes(wsh);
    const unreachable = wshCannotReach(wsh);
    if (wsh.state !== 'running') items.push({ id: 'wsh', status: 'fail', title: 'WSH parado', detail: `${wsh.container} está ${wsh.state}.`, fix: { role: 'wsh', action: 'start', label: 'Ligar o WSH' } });
    else if (unreachable) items.push({ id: 'wsh', status: booting ? 'wait' : 'warn', title: 'WSH não alcança o WTA', detail: `O log do WSH mostra "${unreachable}". Ele tenta de novo sozinho; se continuar, confira o WTA_HOST do .env do WSH.` });
    else if (routes.length)
      items.push({
        id: 'wsh',
        status: booting ? 'wait' : 'warn',
        title: 'WSH chama rotas que o WTA não tem',
        detail: `${routes.slice(0, 3).join(', ')}${routes.length > 3 ? ` e mais ${routes.length - 3}` : ''}: HTTP 404 no WTA. ${booting ? 'O WTA acabou de subir; espere.' : 'O serviço dessas rotas não subiu no WTA: reinicie o WTA, e se continuar falta a feature dele na lista da versão.'}`,
        ...(booting ? {} : { fix: RESTART_WTA })
      });
    else items.push({ id: 'wsh', status: 'ok', title: 'WSH conversando com o WTA', detail: `${wsh.container} rodando, sem erro de rota ou conexão no fim do log.` });
  }
  return items;
}

/**
 * O resumo de sempre, corrigido pela validação: "no ar" só quando nada dela falha ou espera; um ponto que falha vira o
 * título; e o WTA travado ganha a causa quando ele ligou antes do banco.
 */
export function refineSummary(base: NonNullable<InfrEnvCheck['summary']>, items: InfrPostItem[]): NonNullable<InfrEnvCheck['summary']> {
  const order = items.find((i) => i.id === 'ordem' && i.status === 'fail');
  if (base.status === 'fail' || base.status === 'missing') {
    return order && base.title === 'O WTA não termina de subir' ? { ...base, title: 'O WTA subiu antes do banco e travou', detail: `${order.detail} ${base.detail}` } : base;
  }
  const fail = items.find((i) => i.status === 'fail');
  if (fail) return { status: 'fail', title: fail.title, detail: fail.detail };
  if (base.status !== 'ok') return base;
  const wait = items.filter((i) => i.status === 'wait');
  if (wait.length) return { status: 'starting', title: `Quase pronto: ${wait.map((i) => i.title.toLowerCase()).join(', ')}`, detail: wait.map((i) => i.detail).join(' ') };
  const warn = items.filter((i) => i.status === 'warn');
  if (warn.length) return { status: 'ok', title: 'No ar, com avisos', detail: `${base.detail} ${warn.map((i) => i.detail).join(' ')}` };
  return { ...base, title: 'Ambiente pronto para usar', detail: `${base.detail} Banco, ordem de subida, Karaf, login${items.some((i) => i.id === 'wsh') ? ' e WSH' : ''} conferidos.` };
}
