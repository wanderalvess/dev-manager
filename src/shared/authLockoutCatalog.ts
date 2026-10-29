import type { AuthLockoutCheckId, AuthLockoutDefaults } from './authLockoutTypes';

export interface AuthLockoutCheckDefinition {
  id: AuthLockoutCheckId;
  title: string;
  /** Tentativa controlada feita em homologação. */
  attempt: string;
  /** O que precisa ser verdade para passar. */
  expectation: string;
  /** Espera minutos (janela ou duração do bloqueio). */
  slow?: boolean;
  needsUserB?: boolean;
}

/** As 12 checagens, na ordem em que a execução as resolve (a ordem reaproveita o mesmo bloqueio da conta A). */
export const AUTH_LOCKOUT_CHECKS: readonly AuthLockoutCheckDefinition[] = [
  {
    id: 'threshold',
    title: 'Limiar de bloqueio',
    attempt: 'Errar 4 vezes e, em execução independente, 5 vezes em menos de 60 segundos',
    expectation: 'Não bloquear antecipadamente; bloquear na quinta falha.'
  },
  {
    id: 'correct-password-while-locked',
    title: 'Senha correta durante bloqueio',
    attempt: 'Após bloquear a conta, tentar a senha correta',
    expectation: 'Não emitir token nem criar sessão.'
  },
  {
    id: 'client-switch',
    title: 'Troca de cliente',
    attempt: 'Tentar a conta bloqueada em outra sessão ou cliente HTTP',
    expectation: 'O bloqueio não pode depender apenas de cookie ou sessão local.'
  },
  {
    id: 'per-user',
    title: 'Bloqueio por usuário',
    attempt: 'Usar dois usuários de teste na mesma origem',
    expectation: 'Bloquear A não deve bloquear B.',
    needsUserB: true
  },
  {
    id: 'logoff-bypass',
    title: 'Logoff como contorno',
    attempt: 'Bloquear a conta, chamar logoff e tentar login novamente',
    expectation: 'Logoff não deve limpar o bloqueio.'
  },
  {
    id: 'concurrency',
    title: 'Concorrência',
    attempt: 'Enviar um pequeno lote limitado de falhas simultâneas para a mesma conta',
    expectation: 'Não perder incrementos nem permitir autenticação indevida por condição de corrida.',
    needsUserB: true
  },
  {
    id: 'lock-duration',
    title: 'Duração do bloqueio',
    attempt: 'Testar imediatamente antes e depois da expiração',
    expectation: 'Liberar somente após o prazo definido (4 ou 5 minutos, ainda a confirmar).',
    slow: true
  },
  {
    id: 'count-window',
    title: 'Janela de contagem',
    attempt: 'Distribuir falhas antes e depois do limite de 60 segundos',
    expectation: 'Conferir a regra de janela implementada, sem presumir janela fixa ou deslizante.',
    slow: true
  },
  {
    id: 'api-exceptions',
    title: 'Exceções de APIs diferentes',
    attempt: 'Provocar falhas controladas, isoladas e simultâneas',
    expectation: 'Middleware deve tratar cada falha sem misturar dados entre requisições.'
  },
  {
    id: 'error-exposure',
    title: 'Exposição de erro',
    attempt: 'Inspecionar status, corpo e cabeçalhos, com e sem autenticação quando aplicável',
    expectation: 'Não expor stack trace, senha, token ou string de conexão.'
  },
  {
    id: 'log-correlation',
    title: 'Registro e consulta de logs',
    attempt: 'Correlacionar cada falha com o registro interno e consultar o endpoint de logs',
    expectation: 'Não perder eventos; restringir o acesso aos logs e não registrar segredos.'
  },
  {
    id: 'log-sink-failure',
    title: 'Falha no próprio mecanismo de logs',
    attempt: 'Simular indisponibilidade do destino de logs por mecanismo autorizado',
    expectation: 'Não entrar em recursão de exceções nem derrubar o serviço.'
  }
];

export const AUTH_LOCKOUT_CHECK_IDS = AUTH_LOCKOUT_CHECKS.map((c) => c.id);

export function authLockoutCheckDefinition(id: AuthLockoutCheckId): AuthLockoutCheckDefinition {
  return AUTH_LOCKOUT_CHECKS.find((c) => c.id === id) ?? AUTH_LOCKOUT_CHECKS[0];
}

export const AUTH_LOCKOUT_LOGIN_PATH = '/winthor/autenticacao/v1/login';
export const AUTH_LOCKOUT_LOGOFF_PATH = '/winthor/autenticacao/v1/logoff';
export const AUTH_LOCKOUT_LOGS_PATH = '/winthor/ferramenta/servidor/v1/logs';
export const AUTH_LOCKOUT_LOCKED_PATTERN = 'bloquead|locked|tentativas|excedid';

export const AUTH_LOCKOUT_LIMITS = { maxThreshold: 20, maxWindowSeconds: 600, maxLockMinutes: 30, maxConcurrency: 10 } as const;

export function authLockoutBaseDefaults(): Omit<AuthLockoutDefaults, 'baseUrl' | 'logsUrl' | 'logFilePath'> {
  return {
    loginPath: AUTH_LOCKOUT_LOGIN_PATH,
    logoffPath: AUTH_LOCKOUT_LOGOFF_PATH,
    threshold: 5,
    windowSeconds: 60,
    lockMinutesCandidates: [4, 5],
    concurrency: 3,
    lockedPattern: AUTH_LOCKOUT_LOCKED_PATTERN
  };
}

/** Estimativa em minutos, para avisar antes de começar: a duração do bloqueio e a janela dominam o tempo. */
export function estimateAuthLockoutMinutes(
  checks: readonly AuthLockoutCheckId[],
  windowSeconds: number,
  lockMinutesCandidates: readonly number[]
): number {
  const has = (id: AuthLockoutCheckId) => checks.includes(id);
  const maxLock = Math.max(0, ...lockMinutesCandidates);
  let seconds = 20;
  if (has('threshold')) seconds += windowSeconds + 10;
  if (has('lock-duration') || has('count-window')) seconds += maxLock * 60 + 20;
  if (has('count-window')) seconds += windowSeconds + 10;
  return Math.max(1, Math.ceil(seconds / 60));
}
