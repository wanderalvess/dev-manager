import { describe, expect, it } from 'vitest';
import { authLockoutBaseDefaults } from '../../../shared/authLockoutCatalog';
import {
  buildRunRequest,
  formBlocker,
  formFromDefaults,
  mergeStoredForm,
  parseMinutesList,
  pendingChecks,
  serializeForm,
  summarizeChecks
} from './authLockoutView';

const defaults = {
  ...authLockoutBaseDefaults(),
  baseUrl: 'http://localhost:81',
  logsUrl: 'http://localhost:81/winthor/ferramenta/servidor/v1/logs',
  logFilePath: 'C:\\karaf\\data\\log\\winthor.log'
};

const filled = () => ({
  ...formFromDefaults(defaults),
  userALogin: 'TESTE_A',
  userAPassword: 'senhaA',
  userBLogin: 'TESTE_B',
  userBPassword: 'senhaB'
});

describe('formulário do teste de bloqueio', () => {
  it('nunca grava senha nem a confirmação do destino de logs', () => {
    const form = { ...filled(), logSinkUnavailableConfirmed: true };
    const raw = serializeForm(form);
    expect(raw).not.toContain('senhaA');
    expect(raw).not.toContain('senhaB');
    const restored = mergeStoredForm(formFromDefaults(defaults), raw);
    expect(restored.userALogin).toBe('TESTE_A');
    expect(restored.userAPassword).toBe('');
    expect(restored.logSinkUnavailableConfirmed).toBe(false);
  });

  it('ignora JSON inválido, chaves estranhas e checagens desconhecidas', () => {
    const base = formFromDefaults(defaults);
    expect(mergeStoredForm(base, '{')).toEqual(base);
    const merged = mergeStoredForm(base, JSON.stringify({ checks: ['threshold', 'xpto'], userAPassword: 'vazou', extra: 1 }));
    expect(merged.checks).toEqual(['threshold']);
    expect(merged.userAPassword).toBe('');
    expect(merged).not.toHaveProperty('extra');
  });

  it('lê a lista de durações com vírgula, ponto e vírgula ou espaço', () => {
    expect(parseMinutesList('4, 5')).toEqual([4, 5]);
    expect(parseMinutesList('4;5 x 0')).toEqual([4, 5]);
  });

  it('monta a requisição só com o usuário B completo', () => {
    expect(buildRunRequest(filled()).userB).toEqual({ login: 'TESTE_B', password: 'senhaB' });
    expect(buildRunRequest({ ...filled(), userBPassword: '' }).userB).toBeUndefined();
    expect(buildRunRequest(filled()).lockMinutesCandidates).toEqual([4, 5]);
  });

  it('aponta o que falta antes de começar', () => {
    expect(formBlocker(filled())).toBeNull();
    expect(formBlocker({ ...filled(), userAPassword: '' })).toContain('usuário de teste A');
    expect(formBlocker({ ...filled(), userBLogin: '' })).toContain('usuário B');
    expect(formBlocker({ ...filled(), userBLogin: '', checks: ['threshold'] })).toBeNull();
    expect(formBlocker({ ...filled(), userBLogin: 'teste_a' })).toContain('diferentes');
    expect(formBlocker({ ...filled(), checks: [] })).toContain('ao menos uma');
  });

  it('checagens não escolhidas começam como não executadas', () => {
    const checks = pendingChecks(['threshold']);
    expect(checks).toHaveLength(12);
    expect(summarizeChecks(checks)).toEqual({ pending: 1, skipped: 11 });
  });
});
