import { describe, it, expect } from 'vitest';
import {
  createEmptyRunner,
  presetToRunner,
  getDefaultCommandArgs,
  getCommandPreview,
  toggleLinkedId,
  formatDurationSeconds,
  getExecutionToast,
  buildExecutionStartMessage
} from './testRunnersUtils';

describe('testRunnersUtils', () => {
  it('createEmptyRunner retorna defaults de maven', () => {
    expect(createEmptyRunner()).toEqual({
      name: '',
      type: 'maven',
      commandArgs: 'test',
      workingDir: '{PROJECTS_PATH}/',
      description: '',
      linkedValidationItemIds: []
    });
  });

  it('presetToRunner mapeia campos do preset', () => {
    const runner = presetToRunner({
      name: 'Cypress E2E',
      type: 'cypress',
      description: 'desc',
      defaultCommandArgs: 'run',
      suggestedWorkingDirPlaceholder: '{PROJECTS_PATH}/x'
    } as never);
    expect(runner.type).toBe('cypress');
    expect(runner.commandArgs).toBe('run');
    expect(runner.workingDir).toBe('{PROJECTS_PATH}/x');
    expect(runner.linkedValidationItemIds).toEqual([]);
  });

  it('getDefaultCommandArgs por tipo', () => {
    expect(getDefaultCommandArgs('maven')).toBe('test');
    expect(getDefaultCommandArgs('playwright')).toBe('test');
    expect(getDefaultCommandArgs('cypress')).toBe('run');
    expect(getDefaultCommandArgs('newman')).toBe('run ./tests/collection.json');
    expect(getDefaultCommandArgs('custom')).toBe('');
  });

  it('getCommandPreview usa fallbacks por tipo', () => {
    expect(getCommandPreview({ type: 'maven' })).toBe('mvn test');
    expect(getCommandPreview({ type: 'playwright', commandArgs: 'test --headed' })).toBe(
      'npx playwright test --headed'
    );
    expect(getCommandPreview({ type: 'cypress' })).toBe('npx cypress run');
    expect(getCommandPreview({ type: 'newman' })).toBe('npx newman run');
    expect(getCommandPreview({ type: 'custom', customCommand: 'pytest', commandArgs: '-x' })).toBe('pytest -x');
    expect(getCommandPreview({ type: 'custom' })).toBe(' ');
  });

  it('toggleLinkedId adiciona e remove sem mutar', () => {
    const base = ['a'];
    expect(toggleLinkedId(base, 'b', true)).toEqual(['a', 'b']);
    expect(toggleLinkedId(base, 'a', false)).toEqual([]);
    expect(toggleLinkedId(undefined, 'a', true)).toEqual(['a']);
    expect(base).toEqual(['a']);
  });

  it('formatDurationSeconds', () => {
    expect(formatDurationSeconds(1500)).toBe('1.5s');
  });

  it('getExecutionToast por status', () => {
    expect(getExecutionToast('R', { status: 'passed', passedCount: 3, failedCount: 0 }).kind).toBe('success');
    expect(getExecutionToast('R', { status: 'aborted', passedCount: 0, failedCount: 0 }).kind).toBe('info');
    const failed = getExecutionToast('R', { status: 'failed', passedCount: 0, failedCount: 2 });
    expect(failed.kind).toBe('error');
    expect(failed.message).toContain('2 erro(s)');
  });

  it('buildExecutionStartMessage inclui nome e tipo', () => {
    const msg = buildExecutionStartMessage({ name: 'X', type: 'maven' });
    expect(msg).toContain('"X" (maven)');
    expect(msg.endsWith('\n\n')).toBe(true);
  });
});
