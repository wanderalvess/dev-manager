import { describe, it, expect } from 'vitest';
import type { DockerContainerInfo } from '../../../shared/types';
import {
  buildEnvironment,
  buildInitialSlotsForNew,
  clampDelay,
  computePresetSlots,
  filterContainers,
  moveSlot,
  toggleSlot,
  updateSlotDelay,
  withCleanNames
} from './saveEnvironmentUtils';

const makeContainer = (names: string, state = 'running', extra: Partial<DockerContainerInfo> = {}) =>
  ({ id: names, names, image: 'img', ports: '', state, ...extra }) as unknown as DockerContainerInfo;

describe('saveEnvironmentUtils', () => {
  it('limpa nomes e filtra por busca', () => {
    const list = withCleanNames([makeContainer('/oracle-db', 'running', { ports: '1521' }), makeContainer('/web')]);
    expect(list[0].cleanName).toBe('oracle-db');
    expect(filterContainers(list, '1521')).toHaveLength(1);
    expect(filterContainers(list, '  ')).toHaveLength(2);
  });

  it('seleciona rodando por padrão e respeita pré-seleção', () => {
    const cs = [makeContainer('/a'), makeContainer('/b', 'exited')];
    expect(buildInitialSlotsForNew(cs).map((s) => s.name)).toEqual(['a']);
    expect(buildInitialSlotsForNew(cs, ['/b']).map((s) => s.name)).toEqual(['b']);
  });

  it('alterna, limita delay e move slots', () => {
    let slots = toggleSlot([], 'A');
    slots = toggleSlot(slots, 'b');
    expect(toggleSlot(slots, 'a')).toEqual([{ name: 'b', delay: 0 }]);
    expect(clampDelay(999)).toBe(300);
    expect(clampDelay(NaN)).toBe(0);
    expect(updateSlotDelay(slots, 'B', -5)[1].delay).toBe(0);
    expect(moveSlot(slots, 0, 'down').map((s) => s.name)).toEqual(['b', 'A']);
    expect(moveSlot(slots, 0, 'up')).toBe(slots);
  });

  it('preset winthor devolve null sem candidatos', () => {
    const none = withCleanNames([makeContainer('/redis')]);
    expect(computePresetSlots('winthor', none)).toBeNull();
    const some = withCleanNames([makeContainer('/oracle'), makeContainer('/wsh1')]);
    expect(computePresetSlots('winthor', some)).toEqual([
      { name: 'oracle', delay: 30 },
      { name: 'wsh1', delay: 0 }
    ]);
    expect(computePresetSlots('clear', some)).toEqual([]);
  });

  it('monta o ambiente com delays apenas quando > 0', () => {
    const env = buildEnvironment({
      name: ' Stack ',
      color: '#fff',
      slots: [
        { name: 'a', delay: 5 },
        { name: 'b', delay: 0 }
      ],
      selectedDistro: 'ubuntu'
    });
    expect(env.name).toBe('Stack');
    expect(env.wslDistro).toBe('ubuntu');
    expect(env.delays).toEqual({ a: 5 });
    expect(env.containers).toEqual([{ id: '1', name: 'a', delay: 5 }, { id: '2', name: 'b' }]);
  });
});
