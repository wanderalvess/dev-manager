import { AUTH_LOCKOUT_STATUS_LABELS } from '../../../shared/authLockoutReport';
import { authLockoutCheckDefinition } from '../../../shared/authLockoutCatalog';
import type { AuthLockoutCheckResult, AuthLockoutCheckStatus } from '../../../shared/authLockoutTypes';
import type { LockoutRun } from './lockoutRun';

const path = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

/** Abre a atividade dizendo com o que o teste vai rodar, para quem lê depois saber as condições. */
export function logRunStart(run: LockoutRun, logOffset: number | undefined): void {
  const c = run.config;
  const checks = [...c.checks].map((id) => authLockoutCheckDefinition(id).title);
  run.note(`▶ Preparação do teste ${run.runId}`, 'step', {
    detail: 'Antes de errar qualquer senha, o teste registra as condições abaixo; elas também vão para o relatório.'
  });
  run.note(`WTA: ${c.baseUrl} (login em ${path(c.loginUrl)}${c.logoffUrl ? `, logoff em ${path(c.logoffUrl)}` : ', sem logoff'}).`);
  run.note(
    `Usuário A: ${c.userA.login} (é bloqueado de propósito e fica assim durante quase todo o teste). Usuário B: ${c.userB?.login ?? 'não informado (bloqueio por usuário e concorrência não rodam)'}.`
  );
  run.note(
    `Regra conferida: ${c.threshold} falhas em menos de ${c.windowSeconds}s bloqueiam a conta por ${c.lockMinutesCandidates.join(' ou ')} min.`
  );
  run.note(
    c.passwordEncoding === 'md5'
      ? 'Senha enviada ao WTA como MD5 em maiúsculas (é o formato que o login do WinThor espera). Senhas e tokens aparecem mascarados aqui.'
      : 'Senha enviada ao WTA em texto puro. Senhas e tokens aparecem mascarados aqui.'
  );
  run.note(
    c.logFilePath
      ? logOffset !== undefined
        ? `Log local: ${c.logFilePath} (${logOffset} bytes agora; só o que for escrito daqui em diante é lido).`
        : `Log local: ${c.logFilePath} (não encontrado agora; a correlação com o arquivo vai avisar).`
      : 'Log local: não configurado (só a API de logs entra na correlação).'
  );
  run.note(`API de logs: ${c.logsUrl}.`);
  run.note(`Checagens desta execução (${checks.length}): ${checks.join(', ')}.`);
}

export function logPreflightStart(run: LockoutRun): void {
  run.note('▶ Pré-voo', 'step', {
    detail:
      'Confere se os usuários de teste entram com a senha informada antes de qualquer erro proposital. Se A não entrar, o teste para aqui, sem bloquear ninguém; o token de A é guardado para as checagens de troca de cliente e logoff.'
  });
}

/** Usuários cuja última tentativa com a senha certa foi recusada: provavelmente continuam bloqueados. */
function stillLocked(run: LockoutRun): string[] {
  const users = [run.config.userA.login, run.config.userB?.login].filter((u): u is string => !!u);
  return users.filter((user) => {
    const last = [...run.attempts].reverse().find((a) => a.user === user && a.kind === 'login-correct');
    return !!last && last.status > 0 && last.outcome !== 'authenticated';
  });
}

/** Fecha a atividade com o placar, o motivo de parada e quem pode continuar bloqueado. */
export function logRunEnd(run: LockoutRun, checks: AuthLockoutCheckResult[], error: string | undefined): void {
  const counts = checks.reduce<Partial<Record<AuthLockoutCheckStatus, number>>>((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {});
  const score = (Object.entries(counts) as [AuthLockoutCheckStatus, number][])
    .map(([status, n]) => `${n} ${AUTH_LOCKOUT_STATUS_LABELS[status]}`)
    .join(', ');
  const seconds = (run.elapsedMs() / 1000).toFixed(0);
  const why = error ? ` Parou antes do fim: ${error}` : run.isAborted ? ' Interrompido por quem estava rodando.' : '';
  run.note(`■ Fim do teste em ${seconds}s: ${score}.${why}`, error ? 'error' : 'step', {
    detail: `${run.attempts.length} requisições ao WTA. Abra cada regra para ver como foi testada e as evidências.`
  });
  const locked = stillLocked(run);
  if (locked.length > 0) {
    run.note(
      `${locked.join(' e ')} ${locked.length > 1 ? 'podem continuar bloqueados' : 'pode continuar bloqueado'} até o fim do prazo (${run.config.lockMinutesCandidates.join(' ou ')} min). Aguarde antes de rodar de novo.`
    );
  }
}
