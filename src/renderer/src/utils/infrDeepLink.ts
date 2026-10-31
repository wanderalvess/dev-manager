const EVENT_NAME = 'hub:infr-first-steps';
let pending = false;

/**
 * Pede à tela WinThor & WSL para abrir o Assistente INFR em Primeiros passos (vale também se a
 * tela ainda não foi montada: ela consome o pedido ao ficar ativa).
 */
export function requestInfrFirstSteps(): void {
  pending = true;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/** Consome o pedido feito antes de a tela montar; devolve se havia um. */
export function takePendingInfrFirstSteps(): boolean {
  const had = pending;
  pending = false;
  return had;
}

export function onInfrFirstStepsRequested(listener: () => void): () => void {
  const handler = () => {
    pending = false;
    listener();
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
