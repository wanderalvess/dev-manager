import { describe, expect, it } from 'vitest';
import {
  buildRiskConfirmMessage,
  buildSwitchToAutoMessage,
  describePending,
  resolveInitialTxMode
} from './databaseSessionUtils';

describe('resolveInitialTxMode', () => {
  it('produção começa em manual; demais em auto', () => {
    expect(resolveInitialTxMode({ isProduction: true }, null)).toBe('manual');
    expect(resolveInitialTxMode({ isProduction: false }, null)).toBe('auto');
    expect(resolveInitialTxMode({}, null)).toBe('auto');
    expect(resolveInitialTxMode(null, null)).toBe('auto');
  });

  it('a escolha guardada do usuário vence o padrão da conexão', () => {
    expect(resolveInitialTxMode({ isProduction: true }, 'auto')).toBe('auto');
    expect(resolveInitialTxMode({ isProduction: false }, 'manual')).toBe('manual');
  });
});

describe('describePending', () => {
  it('descreve nenhuma, uma e várias alterações, com e sem linhas', () => {
    expect(describePending(null)).toBe('Nenhuma alteração pendente');
    expect(describePending({ pendingStatements: 0, pendingRows: 0 })).toBe('Nenhuma alteração pendente');
    expect(describePending({ pendingStatements: 1, pendingRows: 1 })).toBe('1 alteração pendente (1 linha)');
    expect(describePending({ pendingStatements: 3, pendingRows: 12 })).toBe('3 alterações pendentes (12 linhas)');
    expect(describePending({ pendingStatements: 2, pendingRows: 0 })).toBe('2 alterações pendentes');
  });
});

describe('buildRiskConfirmMessage', () => {
  it('UPDATE/DELETE sem WHERE pergunta só em auto-commit', () => {
    const risk = { reason: 'no-where' as const, verb: 'DELETE' };
    expect(buildRiskConfirmMessage(risk, 'auto')).toMatch(/DELETE sem WHERE.*TODAS as linhas/s);
    expect(buildRiskConfirmMessage(risk, 'manual')).toBeNull();
  });

  it('DROP/TRUNCATE pergunta nos dois modos', () => {
    const risk = { reason: 'ddl' as const, verb: 'TRUNCATE' };
    expect(buildRiskConfirmMessage(risk, 'auto')).toMatch(/TRUNCATE não pode ser desfeito/);
    expect(buildRiskConfirmMessage(risk, 'manual')).toMatch(/TRUNCATE não pode ser desfeito/);
  });

  it('comando seguro não pergunta', () => {
    expect(buildRiskConfirmMessage(null, 'auto')).toBeNull();
  });
});

describe('buildSwitchToAutoMessage', () => {
  it('só avisa quando há alterações pendentes', () => {
    expect(buildSwitchToAutoMessage(null)).toBeNull();
    expect(buildSwitchToAutoMessage({ pendingStatements: 0, pendingRows: 0 })).toBeNull();
    expect(buildSwitchToAutoMessage({ pendingStatements: 2, pendingRows: 5 })).toMatch(/2 alterações pendentes \(5 linhas\).*CONFIRMAR/s);
  });
});
