/**
 * Conferência da origem logo no passo 1 da Nova versão: antes de a pessoa preencher banco e portas,
 * o Hub confere a pasta do INFR-Docker, se o WTA de origem está no ar e se o login dele entra.
 * Sem isso, só o passo 4 descobria a falta de senha.
 */
import type { InfrReviewStatus } from './infrNewVersionReview';

export type InfrOriginCheckId = 'pasta' | 'wta' | 'login';

export interface InfrOriginCheckItem {
  id: InfrOriginCheckId;
  status: InfrReviewStatus;
  title: string;
  detail: string;
  /** Pede usuário e senha do WTA ali mesmo */
  askCredentials?: boolean;
}

export interface InfrOriginCheck {
  success: boolean;
  error?: string;
  originWtaUrl?: string;
  items: InfrOriginCheckItem[];
}

export interface InfrOriginCheckInput {
  folder: string;
  missingScripts: string[];
  container: string;
  /** Estado do container (docker inspect); undefined = não existe */
  state?: string;
  url?: string;
  http?: { status?: number; error?: string };
  login?: { ok: boolean; user?: string; error?: string; needsCredentials?: boolean };
}

/** Itens da conferência, na ordem pasta, WTA, login; um que falha deixa os seguintes como "não conferido". */
export function buildOriginCheck(i: InfrOriginCheckInput): InfrOriginCheckItem[] {
  const items: InfrOriginCheckItem[] = [];
  if (i.missingScripts.length) {
    items.push({
      id: 'pasta',
      status: 'block',
      title: 'Pasta do INFR-Docker sem os scripts da Nova versão',
      detail: `${i.folder} não tem ${i.missingScripts.map((m) => m.split('/').pop()).join(', ')}. Na pasta, rode "git fetch" e "git checkout feature/imagem-por-versao".`
    });
  } else {
    items.push({ id: 'pasta', status: 'ok', title: 'Pasta do INFR-Docker', detail: `${i.folder} tem os scripts da Nova versão.` });
  }

  if (!i.state) {
    items.push({ id: 'wta', status: 'block', title: `${i.container} não existe`, detail: 'Escolha um ambiente que tenha WTA, ou atualize a lista.' });
  } else if (i.state !== 'running') {
    items.push({
      id: 'wta',
      status: 'block',
      title: `${i.container} está ${i.state}`,
      detail: `Inicie o ambiente de origem (docker start ${i.container}) e espere o WinThor subir; o Hub lê as features e o catálogo dele.`
    });
  } else if (!i.url) {
    items.push({ id: 'wta', status: 'block', title: `${i.container} sem porta publicada`, detail: 'A porta 8080 do WTA não está publicada no Windows.' });
  } else if (!i.http?.status || i.http.status >= 500) {
    items.push({
      id: 'wta',
      status: 'block',
      title: 'O WTA de origem ainda não responde',
      detail: `${i.url} ${i.http?.status ? `respondeu HTTP ${i.http.status}` : `não respondeu (${i.http?.error ?? 'sem resposta'})`}. Logo depois de iniciar, o WinThor leva alguns minutos; confira de novo.`
    });
  } else {
    items.push({ id: 'wta', status: 'ok', title: 'WTA de origem no ar', detail: `${i.container} respondeu em ${i.url}.` });
  }

  const wtaOk = items[items.length - 1].status === 'ok';
  if (!wtaOk || !i.login) {
    items.push({ id: 'login', status: 'warn', title: 'Login no WTA não conferido', detail: 'Confere quando o WTA de origem estiver no ar.' });
  } else if (i.login.ok) {
    items.push({ id: 'login', status: 'ok', title: 'Login no WTA', detail: `${i.login.user ?? 'O usuário'} entrou no WTA de origem; o catálogo da 801 vai ler com ele.` });
  } else {
    items.push({
      id: 'login',
      status: 'block',
      title: i.login.needsCredentials ? 'Falta o usuário do WTA' : 'O WTA recusou o login',
      detail: i.login.needsCredentials
        ? 'O catálogo da 801 exige login. Informe o usuário e a senha do WinThor abaixo (ficam salvos nas Configurações, em Rotinas WinThor).'
        : `${i.login.error ?? 'Login recusado'}. Confira o usuário e a senha abaixo: o usuário precisa existir no banco do ambiente de origem.`,
      askCredentials: true
    });
  }
  return items;
}

export const originCheckBlocks = (items: InfrOriginCheckItem[]) => items.some((it) => it.status === 'block');
