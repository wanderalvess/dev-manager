/**
 * Teste de bloqueio de login do WinThor (Validação de Cenários → Bloqueio de Login): tentativas controladas contra o
 * login do WTA, correlacionadas com o winthor.log e com a API de logs do ferramenta-servidor.
 */

export type AuthLockoutCheckId =
  | 'threshold'
  | 'correct-password-while-locked'
  | 'logoff-bypass'
  | 'per-user'
  | 'client-switch'
  | 'concurrency'
  | 'count-window'
  | 'lock-duration'
  | 'api-exceptions'
  | 'error-exposure'
  | 'log-correlation'
  | 'log-sink-failure';

/** `info` = comportamento observado sem veredito (ex.: qual janela de contagem o servidor usa). */
export type AuthLockoutCheckStatus = 'pending' | 'running' | 'passed' | 'failed' | 'warning' | 'info' | 'manual' | 'skipped';

/** Como o servidor respondeu a uma tentativa de login. `rejected` não distingue senha errada de conta bloqueada. */
export type LoginOutcome = 'authenticated' | 'locked' | 'rejected' | 'error';

export type AuthLockoutAttemptKind = 'login-wrong' | 'login-correct' | 'logoff' | 'logs' | 'probe';

/** O que apareceu numa resposta e não deveria (status, corpo ou cabeçalhos). */
export type ExposureFinding =
  | 'stack-trace'
  | 'exception-message'
  | 'password'
  | 'token'
  | 'connection-string'
  | 'sql-error'
  | 'server-version';

/** `md5` = MD5 em hexadecimal maiúsculo, como o login do WTA espera; `plain` = a senha como foi digitada. */
export type AuthLockoutPasswordEncoding = 'md5' | 'plain';

export interface AuthLockoutUser {
  login: string;
  password: string;
}

export interface AuthLockoutRunRequest {
  /** URL base do WTA. Padrão: a URL do WTA de Configurações. */
  baseUrl?: string;
  loginPath?: string;
  /** Vazio desliga a checagem de logoff (fica como manual). */
  logoffPath?: string;
  /** URL completa da API de logs. Padrão: `<baseUrl>/winthor/ferramenta/servidor/v1/logs`. */
  logsUrl?: string;
  /** Padrão: `<pasta do Karaf>/data/log/winthor.log`. */
  logFilePath?: string;
  userA: AuthLockoutUser;
  /** Como a senha vai no corpo do login (padrão `md5`). */
  passwordEncoding?: AuthLockoutPasswordEncoding;
  /** Necessário para "Bloqueio por usuário" e "Concorrência". */
  userB?: AuthLockoutUser;
  /** Falhas que bloqueiam a conta (padrão 5). */
  threshold?: number;
  /** Janela de contagem em segundos (padrão 60). */
  windowSeconds?: number;
  /** Durações de bloqueio ainda não confirmadas, em minutos (padrão [4, 5]). */
  lockMinutesCandidates?: number[];
  /** Tentativas simultâneas com a senha certa enquanto a conta está bloqueada (padrão 3, máximo 10). */
  concurrency?: number;
  /** Checagens a executar. Vazio = todas. */
  checks?: AuthLockoutCheckId[];
  /** A pessoa tornou o destino de logs indisponível por um mecanismo autorizado antes de rodar. */
  logSinkUnavailableConfirmed?: boolean;
  /** Regex (sem barras) que identifica a resposta de conta bloqueada. */
  lockedPattern?: string;
  requestTimeoutMs?: number;
}

export interface AuthLockoutAttempt {
  seq: number;
  at: string;
  /** Milissegundos desde o início da execução. */
  offsetMs: number;
  checkId: AuthLockoutCheckId | 'preflight';
  label: string;
  user?: string;
  kind: AuthLockoutAttemptKind;
  /** Chamada feita com token (só nas consultas à API de logs e no logoff). */
  withAuth?: boolean;
  method: string;
  /** Caminho chamado, sem query string. */
  path: string;
  /** 0 = sem resposta (timeout ou conexão recusada). */
  status: number;
  outcome?: LoginOutcome;
  durationMs: number;
  issuedToken: boolean;
  setSessionCookie: boolean;
  /** Trecho do corpo com senhas e tokens mascarados. */
  bodySnippet: string;
  exposure: ExposureFinding[];
  error?: string;
}

export interface AuthLockoutCheckResult {
  id: AuthLockoutCheckId;
  title: string;
  status: AuthLockoutCheckStatus;
  summary: string;
  evidence: string[];
  durationMs?: number;
  /** Como a checagem foi feita, com os números desta execução (usuários, limiar, janela). */
  plan?: string;
}

/** Tipo de linha da atividade: o passo começando, uma ação dentro dele, uma requisição, uma espera ou o resultado. */
export type AuthLockoutLogLevel = 'step' | 'action' | 'attempt' | 'wait' | 'result' | 'error';

export interface AuthLockoutLogEntry {
  at: string;
  level: AuthLockoutLogLevel;
  message: string;
  /** Complemento da linha (ex.: o trecho mascarado da resposta do WTA). */
  detail?: string;
  /** Na linha de requisição: o resultado bateu com o esperado? */
  asExpected?: boolean;
  /** Na linha de resultado: o status da checagem. */
  status?: AuthLockoutCheckStatus;
}

export interface AuthLockoutRunResult {
  success: boolean;
  error?: string;
  runId: string;
  startedAt: string;
  finishedAt: string;
  aborted: boolean;
  baseUrl: string;
  logsUrl: string;
  logFilePath?: string;
  checks: AuthLockoutCheckResult[];
  attempts: AuthLockoutAttempt[];
  /** Passo a passo da execução (sem a contagem regressiva das esperas). */
  log: AuthLockoutLogEntry[];
  /** Relatório pronto para colar no Jira. */
  markdown: string;
}

export interface AuthLockoutProgress extends AuthLockoutLogEntry {
  runId: string;
  check?: AuthLockoutCheckResult;
  attempt?: AuthLockoutAttempt;
}

export interface AuthLockoutDefaults {
  baseUrl: string;
  loginPath: string;
  logoffPath: string;
  logsUrl: string;
  logFilePath?: string;
  threshold: number;
  windowSeconds: number;
  lockMinutesCandidates: number[];
  concurrency: number;
  lockedPattern: string;
  passwordEncoding: AuthLockoutPasswordEncoding;
}
