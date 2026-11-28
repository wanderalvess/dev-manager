import { describe, expect, it } from 'vitest';
import { topologyBusStackState } from './topologyBusState';

type Flags = { exists: boolean; running: boolean };
const node = ({ exists, running }: Flags) => ({ container: null, name: 'x', port: '', exists, running });
const topology = (o: Flags, w: Flags, s: Flags, flags: { complete?: boolean; missing?: boolean } = {}) => ({
  oracle: node(o),
  wta: node(w),
  wsh: node(s),
  isStackComplete: flags.complete ?? false,
  hasMissingDependency: flags.missing ?? false
});
const up = { exists: true, running: true };
const down = { exists: true, running: false };
const none = { exists: false, running: false };

describe('topologyBusStackState', () => {
  it('prioriza completa sobre dependencia ausente', () => {
    expect(topologyBusStackState(topology(up, up, up, { complete: true, missing: true }))).toBe('complete');
  });
  it('detecta dependencia ausente', () => {
    expect(topologyBusStackState(topology(down, up, none, { missing: true }))).toBe('missing');
  });
  it('diz que nada foi criado quando não existe nenhum container da pilha', () => {
    expect(topologyBusStackState(topology(none, none, none))).toBe('absent');
  });
  it('diz que está parada quando os containers existem e nenhum está no ar', () => {
    expect(topologyBusStackState(topology(down, down, down))).toBe('stopped');
    expect(topologyBusStackState(topology(down, down, none))).toBe('stopped');
  });
  it('cai para parcial quando parte está no ar', () => {
    expect(topologyBusStackState(topology(up, down, none))).toBe('partial');
  });
});
