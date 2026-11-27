import { describe, expect, it } from 'vitest';
import type { WshUpdatePrepareResult } from '../../../shared/wshUpdate';
import { applyConfirmation, canApplyUpdate, formatMegabytes, missingFeatures, verdictView } from './wshUpdateView';

const prepared = (extra: Partial<WshUpdatePrepareResult> = {}): WshUpdatePrepareResult => ({ success: true, version: '1.39.22.31', verdict: 'newer', ...extra });
const check = (ok: boolean) => ({ service: 'winthor-integracao-config', version: '1.39.27.17', found: ok ? '1.39.27.17' : undefined, ok });

describe('wshUpdateView', () => {
  it('formata o tamanho em MB', () => {
    expect(formatMegabytes(74148792)).toBe('71 MB');
    expect(formatMegabytes(3 * 1048576)).toBe('3.0 MB');
    expect(formatMegabytes(undefined)).toBe('—');
  });

  it('traduz o veredito da comparação de versões', () => {
    expect(verdictView('newer').tone).toBe('success');
    expect(verdictView('older').tone).toBe('warning');
    expect(verdictView(undefined).label).toMatch(/desconhecida/);
  });

  it('lista só as features que faltam', () => {
    expect(missingFeatures([check(true), check(false)])).toHaveLength(1);
    expect(missingFeatures(undefined)).toEqual([]);
  });

  it('pede confirmação simples quando está tudo certo', () => {
    const c = applyConfirmation(prepared({ checks: [check(true)] }), 'wsh-local', '1.38.14.57');
    expect(c.tone).toBe('warning');
    expect(c.message).toContain('1.38.14.57 para 1.39.22.31');
  });

  it('avisa com tom de perigo quando falta feature no WTA', () => {
    const c = applyConfirmation(prepared({ checks: [check(false)] }), 'wsh-local', '1.38.14.57');
    expect(c.tone).toBe('danger');
    expect(c.message).toContain('winthor-integracao-config 1.39.27.17');
  });

  it('avisa quando não deu para conferir o WTA e quando a versão é mais antiga', () => {
    const c = applyConfirmation(prepared({ checksError: 'container parado', verdict: 'older' }), 'wsh-local', '1.40.0.1');
    expect(c.tone).toBe('danger');
    expect(c.message).toContain('container parado');
    expect(c.message).toContain('mais antiga');
  });

  it('só libera atualizar a versão preparada, fora de operação em andamento', () => {
    expect(canApplyUpdate(prepared(), ' 1.39.22.31 ', false)).toBe(true);
    expect(canApplyUpdate(prepared(), '1.39.22.32', false)).toBe(false);
    expect(canApplyUpdate(prepared(), '1.39.22.31', true)).toBe(false);
    expect(canApplyUpdate(null, '1.39.22.31', false)).toBe(false);
  });
});
