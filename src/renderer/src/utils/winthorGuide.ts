import type { StackTopology } from './dockerContainerUtils';

export type GuideStatus = 'wrong-runtime' | 'docker-off' | 'not-created' | 'incomplete' | 'starting' | 'stopped' | 'partial' | 'running';
export type GuideActionId = 'use-distro' | 'start-docker' | 'start-stack' | 'create' | 'open-portal' | 'update-wsh';
export type GuideTone = 'info' | 'warning' | 'danger' | 'success';

export interface GuideAction {
  id: GuideActionId;
  label: string;
  /** Dado da ação (ex.: o nome da distro de 'use-distro') */
  value?: string;
}

export interface GuideStep {
  label: string;
  state: 'done' | 'current' | 'todo';
}

export interface WinthorGuide {
  status: GuideStatus;
  tone: GuideTone;
  title: string;
  detail: string;
  primary?: GuideAction;
  secondary: GuideAction[];
  steps: GuideStep[];
}

export interface GuideInput {
  /** `null` enquanto o Hub ainda não sabe se o Docker da distro está ligado */
  daemonRunning: boolean | null;
  sequenceRunning: boolean;
  /** Runtime escolhido na tela: '' é o Docker do Windows, senão o nome da distro do WSL */
  selectedDistro?: string;
  /** Primeira distro do WSL com "winthor" no nome, onde o ambiente costuma ficar */
  winthorDistro?: string;
  topology: Pick<StackTopology, 'oracle' | 'wta' | 'wsh' | 'isStackComplete' | 'hasMissingDependency'>;
}

const join = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`);

/** As quatro etapas, da primeira que falta em diante: a primeira não concluída vira a "atual". */
function buildSteps(i: GuideInput): GuideStep[] {
  const { oracle, wta, wsh } = i.topology;
  const done = [i.daemonRunning === true, oracle.exists && wta.exists, i.topology.isStackComplete, wsh.exists && wsh.running];
  const labels = ['Docker ligado', 'Containers criados', 'Ambiente no ar', 'WSH rodando'];
  const current = done.findIndex((d) => !d);
  return labels.map((label, index) => ({ label, state: done[index] ? 'done' : index === current ? 'current' : 'todo' }));
}

/**
 * O que a pessoa precisa fazer agora na tela WinThor & WSL, a partir do que existe e do que está no ar.
 * Devolve só a próxima ação (uma), para ela não ter que descobrir sozinha a ordem: Docker → criar → subir → usar.
 */
export function computeWinthorGuide(i: GuideInput): WinthorGuide {
  const { oracle, wta, wsh } = i.topology;
  const steps = buildSteps(i);
  const base = { steps, secondary: [] as GuideAction[] };

  const nothingHere = !oracle.exists && !wta.exists && !wsh.exists;
  // O Docker do Windows (ou de outra distro) não tem os containers, mas a distro do WinThor existe: o provável é o Runtime errado
  if (nothingHere && i.winthorDistro && (i.selectedDistro ?? '') !== i.winthorDistro) {
    const where = i.selectedDistro ? `a distro ${i.selectedDistro}` : 'o Docker do Windows';
    return {
      ...base,
      status: 'wrong-runtime',
      tone: 'warning',
      title: `Você está olhando ${where}, não o ambiente WinThor`,
      detail: `O banco, o WTA e o WSH ficam em containers dentro da distro ${i.winthorDistro} do WSL. Troque o Runtime (no topo da tela) para ela e a tela mostra o estado real, com Subir WinThor e Atualizar WSH.`,
      primary: { id: 'use-distro', label: `Usar ${i.winthorDistro}`, value: i.winthorDistro }
    };
  }

  if (i.daemonRunning === false) {
    return {
      ...base,
      status: 'docker-off',
      tone: 'danger',
      title: 'O Docker desta distro está desligado',
      detail: 'Os containers só funcionam com o Docker ligado dentro da distro do WSL. Ligue-o (leva alguns segundos) e a tela passa a mostrar o estado real do banco, do WTA e do WSH.',
      primary: { id: 'start-docker', label: 'Ligar o Docker' }
    };
  }

  const missing = [!oracle.exists && 'o banco Oracle', !wta.exists && 'o WTA'].filter(Boolean) as string[];
  if (nothingHere) {
    return {
      ...base,
      status: 'not-created',
      tone: 'info',
      title: 'Os containers ainda não foram criados',
      detail: 'Banco Oracle, WTA e WSH são containers que precisam ser criados uma vez. O assistente faz isso passo a passo (a primeira vez leva de 40 minutos a 1 hora, quase tudo esperando downloads).',
      primary: { id: 'create', label: 'Criar o ambiente' }
    };
  }
  if (missing.length) {
    return {
      ...base,
      status: 'incomplete',
      tone: 'warning',
      title: `Falta criar ${join(missing)}`,
      detail: 'O ambiente só funciona com o banco Oracle e o WTA. Use o assistente para criar o que está faltando.',
      primary: { id: 'create', label: 'Abrir o assistente' }
    };
  }

  if (i.sequenceRunning) {
    return { ...base, status: 'starting', tone: 'info', title: 'Subindo o ambiente…', detail: 'O Hub liga o banco, espera ficar pronto, liga o WTA e por fim o WSH. Acompanhe na faixa acima; leva de 1 a 3 minutos.' };
  }

  if (i.topology.isStackComplete) {
    const secondary: GuideAction[] = wsh.exists ? [{ id: 'update-wsh', label: 'Atualizar o WSH' }] : [{ id: 'create', label: 'Criar o WSH' }];
    return {
      ...base,
      secondary,
      status: 'running',
      tone: 'success',
      title: 'Ambiente no ar',
      detail: wsh.exists ? 'Banco, WTA e WSH estão funcionando. Para trocar o WSH por uma versão nova, use Atualizar o WSH.' : 'Banco e WTA estão funcionando. O WSH (integração) ainda não foi criado; ele é opcional para usar o portal do WTA.',
      primary: { id: 'open-portal', label: 'Abrir o portal do WTA' }
    };
  }

  const stopped = [!oracle.running && 'o banco Oracle', !wta.running && 'o WTA', wsh.exists && !wsh.running && 'o WSH'].filter(Boolean) as string[];
  const anyRunning = oracle.running || wta.running || wsh.running;
  const orphan = i.topology.hasMissingDependency;
  return {
    ...base,
    status: anyRunning ? 'partial' : 'stopped',
    tone: orphan ? 'danger' : anyRunning ? 'warning' : 'info',
    title: orphan ? 'O banco está parado, mas há serviços ligados' : anyRunning ? `Parte do ambiente está parada: ${join(stopped)}` : 'O ambiente está parado',
    detail: orphan
      ? 'O WTA e o WSH dependem do banco. Subir o ambiente de novo religa tudo na ordem certa.'
      : 'Clique em Subir WinThor: o Hub liga o banco (Oracle), espera ficar pronto, liga o WTA e por fim o WSH, sempre nessa ordem. Leva de 1 a 3 minutos.',
    primary: { id: 'start-stack', label: 'Subir WinThor' }
  };
}

/** Texto curto de cada nó da topologia: criado, parado ou no ar (o "OFF" antigo misturava "parado" com "nem existe"). */
export function nodeStatusLabel(node: { exists: boolean; running: boolean }): { label: string; tone: 'running' | 'stopped' | 'absent' } {
  if (!node.exists) return { label: 'NÃO CRIADO', tone: 'absent' };
  return node.running ? { label: 'NO AR', tone: 'running' } : { label: 'PARADO', tone: 'stopped' };
}

/** A lista de ambientes falhou: o erro cru do wsl.exe não ajuda; diz o provável motivo e o que fazer. */
export function friendlyEnvListError(raw: string | undefined): string {
  if (!raw) return 'Não consegui ler os containers desta distro.';
  if (/Command failed|wsl\.exe|timed out|ETIMEDOUT|killed/i.test(raw)) {
    return 'Não consegui falar com o Docker desta distro: ele pode estar desligado ou ocupado. Use Ligar o Docker (ou espere alguns segundos) e atualize a tela.';
  }
  return raw;
}
