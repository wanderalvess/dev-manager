// Primeira vez: abertura completa, é a primeira impressão do app.
const NEW_USER_TIMING = { bootStartMs: 1500, lineMs: 380 };
// Quem já usa o app abre o Hub todo dia: a mesma abertura, só que enxuta (~2 s em vez de ~5,4 s).
const RETURNING_TIMING = { bootStartMs: 400, lineMs: 140 };

/** Quanto a abertura espera antes do boot e entre as linhas do boot. */
export const getSplashTiming = (isNewUser: boolean) => (isNewUser ? NEW_USER_TIMING : RETURNING_TIMING);

/** Quem já usa o app não precisa clicar para entrar: a abertura some sozinha pouco depois do boot. */
export const RETURNING_AUTO_CLOSE_MS = 900;
