import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { onInfrFirstStepsRequested, requestInfrFirstSteps, takePendingInfrFirstSteps } from './infrDeepLink';

// Sem DOM nos testes: o EventTarget do Node tem a mesma API de eventos do window
beforeAll(() => vi.stubGlobal('window', new EventTarget()));

describe('infrDeepLink', () => {
  afterEach(() => takePendingInfrFirstSteps());

  it('guarda o pedido para a tela que ainda não montou e consome uma vez só', () => {
    requestInfrFirstSteps();
    expect(takePendingInfrFirstSteps()).toBe(true);
    expect(takePendingInfrFirstSteps()).toBe(false);
  });

  it('a tela montada recebe o evento e o pedido não fica pendente', () => {
    const listener = vi.fn();
    const off = onInfrFirstStepsRequested(listener);
    requestInfrFirstSteps();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(takePendingInfrFirstSteps()).toBe(false);
    off();
    requestInfrFirstSteps();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
