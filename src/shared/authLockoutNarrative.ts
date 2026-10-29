import type { AuthLockoutAttempt, AuthLockoutCheckId } from './authLockoutTypes';

export const DURATION_MARGIN_SECONDS = 10;
/** Depois da maior duração candidata, ainda sonda mais este tanto antes de desistir. */
const EXTRA_WAIT_SECONDS = 60;

/** Momentos das sondas (segundos após o bloqueio): logo antes e logo depois de cada duração candidata. */
export function durationProbeOffsets(candidatesMinutes: readonly number[], marginSeconds = DURATION_MARGIN_SECONDS): number[] {
  const offsets = candidatesMinutes.flatMap((m) => [m * 60 - marginSeconds, m * 60 + marginSeconds]);
  const max = Math.max(...candidatesMinutes) * 60;
  offsets.push(max + EXTRA_WAIT_SECONDS);
  return [...new Set(offsets.filter((o) => o > 0))].sort((a, b) => a - b);
}

/** Números e nomes desta execução, para os textos falarem do teste de verdade (não de "usuário A"). */
export interface NarrativeContext {
  userA: string;
  userB?: string;
  threshold: number;
  windowSeconds: number;
  lockMinutes: number[];
  concurrency: number;
  logsUrl: string;
  logFilePath?: string;
  logoffPath?: string;
  /** Segundos após o bloqueio em que a duração é sondada. */
  probeOffsets: number[];
}

const list = (items: (string | number)[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

/** O que a checagem vai fazer e como ler o resultado, escrito para quem não conhece o teste. */
export function checkPlan(id: AuthLockoutCheckId, c: NarrativeContext): string {
  const { userA: a, threshold: t, windowSeconds: w } = c;
  const b = c.userB ?? 'o usuário B';
  const minLock = Math.min(...c.lockMinutes);
  const maxLock = Math.max(...c.lockMinutes);
  switch (id) {
    case 'threshold':
      return `Erra a senha de ${a} ${t - 1} vezes seguidas e confere com a senha certa: tem de entrar, porque ${t - 1} falhas ainda não podem bloquear. Depois espera ${w + 5}s para a contagem recomeçar (execução independente), erra ${t} vezes seguidas em menos de ${w}s e confere de novo: agora a senha certa tem de ser recusada, porque a ${t}ª falha bloqueia. Cada falha usa uma senha errada diferente, para depois procurá-las nos logs.`;
    case 'correct-password-while-locked':
      return `Com ${a} bloqueado, envia a senha certa. O WTA tem de recusar sem devolver token (accessToken/JWT) e sem gravar cookie de sessão; se devolver qualquer um dos dois, o bloqueio é só aparente.`;
    case 'client-switch':
      return `Com ${a} bloqueado, tenta de novo como se fosse outro programa: sem cookie e com outro User-Agent, e depois reaproveitando o token da sessão aberta no pré-voo. Os dois têm de ser recusados: o bloqueio precisa estar guardado no servidor, não no navegador.`;
    case 'per-user':
      return `Com ${a} bloqueado, ${b} entra com a senha certa a partir desta mesma máquina. Tem de entrar: o bloqueio é da conta, não do IP ou da máquina de origem.`;
    case 'logoff-bypass':
      return c.logoffPath
        ? `Chama o logoff (${c.logoffPath}) com o token de ${a} e tenta a senha certa de novo. Tem de continuar recusado: sair da sessão não pode limpar o bloqueio.`
        : 'Sem caminho de logoff informado, esta checagem fica para ser feita à mão.';
    case 'concurrency':
      return `Envia ${t} senhas erradas para ${b} ao mesmo tempo, em paralelo, e confere com a senha certa: tem de estar bloqueado (se não estiver, alguma falha se perdeu na corrida). Depois manda ${c.concurrency} logins simultâneos com a senha certa: nenhum pode entrar.`;
    case 'lock-duration':
      return `Mede quanto tempo ${a} fica bloqueado: tenta a senha certa ${list(c.probeOffsets)}s depois do bloqueio (logo antes e logo depois de ${list(c.lockMinutes)} min) e para na primeira que entrar. Liberar antes de ${minLock} min reprova, e continuar bloqueado depois de ${maxLock} min também.`;
    case 'count-window':
      return `Descobre como o WTA conta as falhas no tempo, com ${a} já liberado: 1 falha em t=0, ${t - 2} perto de t=${w - 6}s (${t - 1} dentro da janela de ${w}s), 1 em t=${w + 1}s, outra em t=${w + 2}s e a senha certa no fim. Se entrar, a janela é fixa e conta a partir da primeira falha; se recusar, é deslizante (ou a contagem é acumulada). Só informa o comportamento, não reprova.`;
    case 'api-exceptions':
      return 'Dispara 3 rodadas de 4 requisições com erro ao mesmo tempo (JSON quebrado no login, usuário inexistente, parâmetro inválido na API de logs e rota que não existe), cada uma com um marcador próprio. Nenhuma resposta pode trazer o marcador de outra (dados misturados entre requisições), ficar sem resposta ou virar erro 5xx.';
    case 'error-exposure':
      return 'Revisa status, corpo e cabeçalhos de todas as respostas do teste, com e sem autenticação, mais um login com Content-Type errado e a API de logs sem token. Procura stack trace Java, a senha usada (digitada ou em MD5), token, string de conexão e erro ORA-. Versão do servidor no cabeçalho só gera atenção.';
    case 'log-correlation':
      return `Consulta a API de logs (${c.logsUrl}) sem token, que tem de recusar com 401 ou 403, e com token. Lê só o trecho do ${c.logFilePath || 'winthor.log'} escrito durante o teste. Para cada usuário, conta as linhas que citam o login junto com uma falha e compara com as falhas enviadas, e procura nas duas fontes as senhas usadas (inclusive em MD5) e os tokens: nada disso pode estar registrado.`;
    case 'log-sink-failure':
      return 'Com o destino de logs já indisponível (você confirma antes de rodar), envia 10 falhas simultâneas de um usuário inexistente e confere se o login e a API de logs continuam respondendo. Sem resposta reprova; erro 5xx gera atenção.';
  }
}

/** O que o WTA respondeu, em português. `rejected` não distingue senha errada de conta bloqueada, e o texto diz isso. */
export function describeResponse(a: AuthLockoutAttempt): string {
  if (a.status === 0) return `sem resposta do servidor (${a.error ?? 'erro de conexão'})`;
  const http = `HTTP ${a.status}`;
  switch (a.outcome) {
    case 'authenticated': {
      const what = [a.issuedToken && 'token', a.setSessionCookie && 'cookie de sessão'].filter(Boolean).join(' e ');
      return `${http}: ENTROU (o WTA devolveu ${what || 'acesso'})`;
    }
    case 'locked':
      return `${http}: recusado como conta bloqueada`;
    case 'rejected':
      return `${http}: recusado (a resposta não diz se foi senha errada ou bloqueio)`;
    case 'error':
      return `${http}: erro do servidor`;
    default:
      return `respondeu ${http}`;
  }
}

/** O que foi enviado, numa palavra, para a linha da atividade. */
export function describeRequest(a: AuthLockoutAttempt): string {
  if (a.kind === 'login-wrong') return `login de ${a.user ?? '?'} com senha errada`;
  if (a.kind === 'login-correct') return `login de ${a.user ?? '?'} com a senha certa`;
  if (a.kind === 'logoff') return `logoff de ${a.user ?? '?'}`;
  if (a.kind === 'logs') return `consulta à API de logs ${a.withAuth ? 'com' : 'sem'} token`;
  return `${a.method} ${a.path}`;
}

export type LoginExpectation = 'enter' | 'refuse';

/** Bateu com o esperado? Sem resposta ou 5xx nunca conta como esperado. */
export function meetsExpectation(a: AuthLockoutAttempt, expect: LoginExpectation | undefined): boolean | undefined {
  if (!expect || !a.outcome) return undefined;
  if (a.outcome === 'error') return false;
  return expect === 'enter' ? a.outcome === 'authenticated' : a.outcome !== 'authenticated';
}

/** Linha da atividade para uma requisição: o que foi, o que voltou e o que se esperava. */
export function attemptLine(a: AuthLockoutAttempt, expect: LoginExpectation | undefined): string {
  const met = meetsExpectation(a, expect);
  const expected = expect ? ` — esperado: ${expect === 'enter' ? 'entrar' : 'recusar'} ${met ? '✔' : '✘'}` : '';
  return `#${a.seq} ${a.label} → ${describeRequest(a)}; ${describeResponse(a)}${expected} (${a.durationMs} ms)`;
}
