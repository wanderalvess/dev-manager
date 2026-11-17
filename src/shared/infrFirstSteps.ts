/**
 * Primeiros passos do Assistente INFR: do computador sem nada até o ambiente WinThor no Docker.
 * O main lê o estado (InfrFirstStepsProbe) e aqui vira o checklist de 8 etapas, cada uma com o
 * que falta e o que fazer. Uma etapa que depende de outra fica bloqueada até a anterior ficar pronta.
 */
import {
  INFR_DISTRO_NAME,
  INFR_DISTRO_TAR,
  WSL_INSTALL_COMMAND,
  WSL_UPDATE_COMMAND,
  firstStepsContainers,
  infrCheckoutCommand,
  infrCloneCommand,
  type DumpImportInput
} from './infrFirstStepsCommands';
import { INFR_NEW_VERSION_BRANCH } from './infrNewVersionScripts';

export type InfrFirstStepId = 'wsl' | 'distro' | 'docker' | 'infr' | 'files' | 'env' | 'wtaSetup' | 'ready';
export type InfrFirstStepStatus = 'ok' | 'warn' | 'fail' | 'blocked' | 'waiting';

export interface InfrFirstStepsProbe {
  wsl: { installed: boolean; version?: string };
  /** Distros do WSL (fora as do Docker Desktop) */
  distros: string[];
  /** A distro do WinThor (com "winthor" no nome) ou a escolhida na tela */
  distro?: string;
  docker?: { version?: string; network: boolean };
  git: boolean;
  infr: { folder: string; exists: boolean; isGit: boolean; branch?: string; missingScripts: string[] };
  files?: { pcsist: boolean; dumps: string[]; winthorIni: boolean; wshJars: string[] };
  version: string;
  envFiles?: { wta: boolean; wsh: boolean };
  containers?: { oracle?: string; wta?: string; wsh?: string };
  wta?: { url?: string; http?: number; error?: string; login?: { ok: boolean; error?: string; needsCredentials?: boolean } };
}

export interface InfrFirstStep {
  id: InfrFirstStepId;
  title: string;
  status: InfrFirstStepStatus;
  /** Uma linha: o que o Hub encontrou ou o que falta */
  detail: string;
  /** Comandos equivalentes, para copiar */
  commands?: { label: string; command: string }[];
}

/** Ações que a tela pede pelo id; o main monta o comando a partir de dados validados. */
export type InfrFirstStepsActionRequest =
  | { id: 'wsl-install' | 'wsl-update' }
  | { id: 'clone' | 'checkout' | 'open-utils'; infrPath?: string }
  | { id: 'create-env' | 'open-env'; infrPath?: string; version: string; which: 'wta' | 'wsh' }
  | { id: 'import-dump'; distro?: string; dump: DumpImportInput };

export interface InfrFirstStepsResult {
  success: boolean;
  error?: string;
  checkedAt?: string;
  probe?: InfrFirstStepsProbe;
  steps: InfrFirstStep[];
}

/** Lê a saída do script único que o main roda na distro (blocos separados por @@). */
export function parseDistroProbe(output: string): Pick<InfrFirstStepsProbe, 'docker' | 'files' | 'containers'> & { wtaPort?: number } {
  const [dockerV = '', network = '', dumps = '', ini = '', jars = '', states = '', port = ''] = output.split('@@').map((s) => s.trim());
  const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const containers: NonNullable<InfrFirstStepsProbe['containers']> = {};
  for (const line of lines(states)) {
    const [role, state] = line.split('|');
    if ((role === 'oracle' || role === 'wta' || role === 'wsh') && state) containers[role] = state;
  }
  const wtaPort = Number(/:(\d{2,5})\s*$/.exec(lines(port)[0] ?? '')?.[1]) || undefined;
  return {
    docker: dockerV ? { version: lines(dockerV)[0], network: network === 'yes' } : undefined,
    files: { pcsist: false, dumps: lines(dumps), winthorIni: ini === 'yes', wshJars: lines(jars) },
    containers,
    wtaPort
  };
}

const running = (s?: string) => s === 'running';

function stepWsl(p: InfrFirstStepsProbe): InfrFirstStep {
  if (!p.wsl.installed) {
    return {
      id: 'wsl', title: 'WSL', status: 'fail',
      detail: 'O WSL não respondeu neste computador. Instale como administrador e reinicie o Windows.',
      commands: [{ label: 'Instalar o WSL (PowerShell como administrador)', command: WSL_INSTALL_COMMAND }]
    };
  }
  return {
    id: 'wsl', title: 'WSL', status: 'ok',
    detail: p.wsl.version ? `WSL ${p.wsl.version} instalado` : 'WSL instalado',
    commands: [{ label: 'Atualizar o WSL', command: WSL_UPDATE_COMMAND }]
  };
}

function stepDistro(p: InfrFirstStepsProbe): InfrFirstStep {
  if (!p.wsl.installed) return { id: 'distro', title: 'Distro do WinThor', status: 'blocked', detail: `Depende do WSL. Enquanto isso, baixe o ${INFR_DISTRO_TAR} do Drive do time.` };
  if (!p.distro) {
    return {
      id: 'distro', title: 'Distro do WinThor', status: 'fail',
      detail: `Nenhuma distro com "winthor" no nome. Baixe o ${INFR_DISTRO_TAR} do Drive do time e importe como ${INFR_DISTRO_NAME}.`
    };
  }
  return { id: 'distro', title: 'Distro do WinThor', status: 'ok', detail: `${p.distro} importada` };
}

function stepDocker(p: InfrFirstStepsProbe): InfrFirstStep {
  if (!p.distro) return { id: 'docker', title: 'Docker na distro', status: 'blocked', detail: 'Depende da distro.' };
  if (!p.docker) return { id: 'docker', title: 'Docker na distro', status: 'fail', detail: `O Docker não respondeu na ${p.distro}. Inicie o serviço pelo Hub.` };
  return {
    id: 'docker', title: 'Docker na distro', status: 'ok',
    detail: `Docker ${p.docker.version ?? ''} rodando${p.docker.network ? ' · rede winthor-network criada' : ' · a rede winthor-network é criada pelo primeiro script'}`.replace('  ', ' ')
  };
}

function stepInfr(p: InfrFirstStepsProbe): InfrFirstStep {
  const { folder, exists, isGit, branch, missingScripts } = p.infr;
  if (!exists || !isGit) {
    return {
      id: 'infr', title: 'Projeto INFR-Docker', status: 'fail',
      detail: exists
        ? `${folder} existe, mas não é um clone do git. Apague ou renomeie a pasta e clone de novo.`
        : `Não encontrado em ${folder}. Se já clonou em outra pasta, indique em Scripts e pasta. O clone pede login no Azure DevOps (Linha-Winthor).` +
          (p.git ? '' : ' Instale antes o Git para Windows.'),
      commands: [{ label: 'Clonar no branch certo (PowerShell)', command: infrCloneCommand(folder) }]
    };
  }
  if (branch !== INFR_NEW_VERSION_BRANCH || missingScripts.length > 0) {
    return {
      id: 'infr', title: 'Projeto INFR-Docker', status: 'warn',
      detail: `Clone em ${folder}, no branch ${branch ?? '?'}. Os scripts por versão ficam em ${INFR_NEW_VERSION_BRANCH}` +
        (missingScripts.length ? ` (faltam ${missingScripts.map((s) => s.split('/').pop()).join(', ')}).` : '.'),
      commands: [{ label: 'Trocar de branch (PowerShell)', command: infrCheckoutCommand(folder) }]
    };
  }
  return { id: 'infr', title: 'Projeto INFR-Docker', status: 'ok', detail: `${folder} no branch ${branch}` };
}

/** O que falta em "Arquivos fora do git", na ordem da tela. */
export function missingFiles(p: InfrFirstStepsProbe): string[] {
  const f = p.files;
  if (!f) return [];
  return [
    !f.pcsist && 'pcsist.tar.gz',
    f.dumps.length === 0 && 'dump do banco (.dmp)',
    !f.winthorIni && 'Winthor.ini',
    f.wshJars.length === 0 && 'jar do WSH'
  ].filter((x): x is string => !!x);
}

function stepFiles(p: InfrFirstStepsProbe): InfrFirstStep {
  if (!p.distro || !p.docker) return { id: 'files', title: 'Arquivos fora do git', status: 'blocked', detail: 'Depende da distro com o Docker rodando.' };
  const missing = missingFiles(p);
  if (missing.length === 0) return { id: 'files', title: 'Arquivos fora do git', status: 'ok', detail: 'pcsist.tar.gz, dump, Winthor.ini e jar do WSH no lugar' };
  return {
    id: 'files', title: 'Arquivos fora do git', status: missing.length >= 3 ? 'fail' : 'warn',
    detail: `Faltam ${missing.join(', ')}. Baixe do Drive do time e solte na pasta indicada.`
  };
}

function stepEnv(p: InfrFirstStepsProbe, ready: boolean): InfrFirstStep {
  const c = firstStepsContainers(p.version);
  if (!ready) return { id: 'env', title: 'Subir o ambiente', status: 'blocked', detail: 'Libera com o INFR-Docker e o pcsist.tar.gz no lugar (o dump pode vir depois).' };
  const s = p.containers ?? {};
  if (running(s.oracle) && running(s.wta)) {
    return { id: 'env', title: 'Subir o ambiente', status: 'ok', detail: `${c.oracle} e ${c.wta} no ar${running(s.wsh) ? `, ${c.wsh} também` : '; o WSH sobe depois da configuração inicial do WTA'}` };
  }
  const up = [s.oracle && c.oracle, s.wta && c.wta].filter(Boolean);
  return {
    id: 'env', title: 'Subir o ambiente', status: 'warn',
    detail: up.length ? `Em andamento: ${up.join(', ')} criado(s). Siga a ordem abaixo.` : `Banco, dump, WTA e WSH da versão ${p.version}, na ordem.`
  };
}

function stepWtaSetup(p: InfrFirstStepsProbe): InfrFirstStep {
  const c = firstStepsContainers(p.version);
  if (!running(p.containers?.wta)) return { id: 'wtaSetup', title: 'Configuração inicial do WTA', status: 'blocked', detail: `Depois que o ${c.wta} subir.` };
  const w = p.wta;
  if (w?.login?.ok) return { id: 'wtaSetup', title: 'Configuração inicial do WTA', status: 'ok', detail: `O login entra no ${c.wta}` };
  if (!w?.http || w.http >= 500) {
    return { id: 'wtaSetup', title: 'Configuração inicial do WTA', status: 'waiting', detail: `O ${c.wta} ainda não responde${w?.url ? ` em ${w.url}` : ''}. O Karaf leva uns 2 minutos.` };
  }
  return {
    id: 'wtaSetup', title: 'Configuração inicial do WTA', status: 'waiting',
    detail: w.login?.needsCredentials
      ? 'O WTA responde. Conclua o instalador e salve o usuário do WTA em Configurações → Rotinas WinThor para o Hub conferir o login.'
      : 'O WTA responde, mas o login não entra: conclua o instalador do WTA (uma vez por WTA novo).'
  };
}

/** As 8 etapas, na ordem, a partir do que o main leu. */
export function buildFirstSteps(p: InfrFirstStepsProbe): InfrFirstStep[] {
  const wsl = stepWsl(p);
  const distro = stepDistro(p);
  const docker = stepDocker(p);
  const infr = stepInfr(p);
  const files = stepFiles(p);
  const canStart = docker.status === 'ok' && infr.status !== 'fail' && !!p.files?.pcsist;
  const env = stepEnv(p, canStart);
  const wtaSetup = stepWtaSetup(p);
  const done = [wsl, distro, docker, infr, files, env, wtaSetup].every((s) => s.status === 'ok');
  const ready: InfrFirstStep = done
    ? { id: 'ready', title: 'Pronto para usar', status: 'ok', detail: `Ambiente ${p.version} no ar e o login do WTA entrando.` }
    : { id: 'ready', title: 'Pronto para usar', status: 'blocked', detail: 'Endereços, logs e como subir nos próximos dias.' };
  return [wsl, distro, docker, infr, files, env, wtaSetup, ready];
}

/** Resumo para a faixa do topo: quantas prontas e a primeira que precisa de atenção. */
export function summarizeFirstSteps(steps: InfrFirstStep[]): { done: number; total: number; next?: InfrFirstStep } {
  return {
    done: steps.filter((s) => s.status === 'ok').length,
    total: steps.length,
    next: steps.find((s) => s.status !== 'ok' && s.status !== 'blocked')
  };
}
