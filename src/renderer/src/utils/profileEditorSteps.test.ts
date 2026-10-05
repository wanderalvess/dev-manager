import { describe, it, expect } from 'vitest';
import type { AutomationStep } from '../../../shared/types';
import {
  applyStepUpdate,
  createProfileEditorStep,
  describeStepSubtitle,
  isStepIncomplete,
  normalizeStepForSave,
  selectedIndexAfterMove,
  selectedIndexAfterRemove,
  swapSteps
} from './profileEditorSteps';

const makeStep = (overrides: Partial<AutomationStep> = {}): AutomationStep => ({
  id: 's1',
  name: 'Etapa',
  type: 'command',
  enabled: true,
  command: 'npm run dev',
  cwd: 'C:\\x',
  port: 3000,
  launchMode: 'wt',
  ...overrides
});

describe('profileEditorSteps', () => {
  it('cria etapas com nome e defaults por tipo', () => {
    const kill = createProfileEditorStep('kill-port');
    expect(kill.name).toBe('Liberar Porta');
    expect(kill.port).toBe(8080);
    const db = createProfileEditorStep('db-query');
    expect(db.sql).toBe('');
    expect(db.dbConnectionId).toBe('');
    expect(createProfileEditorStep().launchMode).toBe('wt');
  });

  it('detecta etapa db-query incompleta', () => {
    expect(isStepIncomplete(makeStep({ type: 'db-query', dbConnectionId: 'a', sql: '  ' }))).toBe(true);
    expect(isStepIncomplete(makeStep({ type: 'db-query', dbConnectionId: 'a', sql: 'select 1' }))).toBe(false);
    expect(isStepIncomplete(makeStep())).toBe(false);
  });

  it('limpa campos incompatíveis ao trocar o tipo', () => {
    const updated = applyStepUpdate(makeStep(), { type: 'browser' });
    expect(updated.port).toBeUndefined();
    expect(updated.command).toBeUndefined();
    expect(updated.cwd).toBe('');
    expect(updated.waitForPort).toBe(false);
  });

  it('mantém campos quando o tipo não muda', () => {
    const updated = applyStepUpdate(makeStep(), { name: 'Outro' });
    expect(updated.command).toBe('npm run dev');
    expect(updated.name).toBe('Outro');
  });

  it('normaliza serviço usando o nome da etapa como alvo', () => {
    const out = normalizeStepForSave(makeStep({ type: 'service-start', name: ' Spooler ', targetName: ' ' }));
    expect(out.targetName).toBe('Spooler');
    expect(out.command).toBeUndefined();
    expect(out.port).toBeUndefined();
  });

  it('normaliza navegador preservando cwd', () => {
    const out = normalizeStepForSave(makeStep({ type: 'browser' }));
    expect(out.cwd).toBe('C:\\x');
    expect(out.command).toBeUndefined();
  });

  it('troca posições e ajusta seleção', () => {
    const a = makeStep({ id: 'a' });
    const b = makeStep({ id: 'b' });
    expect(swapSteps([a, b], 0, 1).map((s) => s.id)).toEqual(['b', 'a']);
    expect(selectedIndexAfterMove(0, 0, 1)).toBe(1);
    expect(selectedIndexAfterMove(1, 0, 1)).toBe(0);
    expect(selectedIndexAfterMove(2, 0, 1)).toBe(2);
    expect(selectedIndexAfterMove(null, 0, 1)).toBeNull();
  });

  it('ajusta seleção após remoção', () => {
    expect(selectedIndexAfterRemove(1, 1)).toBeNull();
    expect(selectedIndexAfterRemove(3, 1)).toBe(2);
    expect(selectedIndexAfterRemove(0, 1)).toBe(0);
    expect(selectedIndexAfterRemove(null, 1)).toBeNull();
  });

  it('descreve subtítulo com porta global para karaf', () => {
    expect(describeStepSubtitle(makeStep({ type: 'karaf', port: undefined }), 5005)).toBe('karaf • :5005');
    expect(describeStepSubtitle(makeStep({ port: 3000 }), 5005)).toBe('command • :3000');
    expect(describeStepSubtitle(makeStep({ type: 'kill-process', port: undefined, targetName: 'node.exe' }), 5005)).toBe(
      'kill-process • node.exe'
    );
  });
});
