// Primeira vez: abertura completa, é a primeira impressão do app.
const NEW_USER_TIMING = { bootStartMs: 1500, lineMs: 380 };
// Quem já usa o app abre o Hub todo dia: a mesma abertura, só que enxuta (~2 s em vez de ~5,4 s).
const RETURNING_TIMING = { bootStartMs: 400, lineMs: 140 };

/**
 * Quanto a abertura espera antes do boot e entre as linhas do boot. Depois do boot, quem já usa o app fica na tela de
 * início (PC, semana, ambientes, clima e novidades) até clicar em Entrar ou apertar Enter: nada fecha sozinho.
 */
export const getSplashTiming = (isNewUser: boolean) => (isNewUser ? NEW_USER_TIMING : RETURNING_TIMING);
