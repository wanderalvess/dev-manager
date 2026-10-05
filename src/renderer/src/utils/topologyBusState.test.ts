import { describe, expect, it } from 'vitest';
import { topologyBusStackState } from './topologyBusState';

describe('topologyBusStackState', () => {
  it('prioriza completa sobre dependencia ausente', () => {
    expect(topologyBusStackState({ isStackComplete: true, hasMissingDependency: true })).toBe('complete');
  });
  it('detecta dependencia ausente', () => {
    expect(topologyBusStackState({ isStackComplete: false, hasMissingDependency: true })).toBe('missing');
  });
  it('cai para parcial', () => {
    expect(topologyBusStackState({ isStackComplete: false, hasMissingDependency: false })).toBe('partial');
  });
});
