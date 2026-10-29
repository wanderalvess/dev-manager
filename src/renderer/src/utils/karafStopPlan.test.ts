import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../../../shared/types';
import { karafStopPlan } from './karafStopPlan';

const settings = (patch: Partial<AppSettings>) => patch as AppSettings;

describe('o que o Parar Karaf derruba', () => {
  it('usa as portas configuradas no app (SSH e debug), com 8101 e 5005 só como padrão', () => {
    expect(karafStopPlan(settings({ karafSshPort: 8102, karafDebugPort: 5006 }))).toEqual({ kind: 'ports', ports: [5006, 8102] });
    expect(karafStopPlan(settings({}))).toEqual({ kind: 'ports', ports: [5005, 8101] });
  });

  it('com o serviço Windows da instalação rodando, não mata processo: o Karaf é do serviço', () => {
    const install = { root: 'C:\\k', found: true, service: { name: 'WinThor', state: 'RUNNING' as const } };
    expect(karafStopPlan(settings({}), install)).toEqual({ kind: 'service', serviceName: 'WinThor' });
    expect(karafStopPlan(settings({}), { ...install, service: { name: 'WinThor', state: 'STOPPED' as const } }).kind).toBe('ports');
  });
});
