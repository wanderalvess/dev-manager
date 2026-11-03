import { describe, expect, it } from 'vitest';
import { envState, forecastDayLabel, formatSaved, formatUptime, greeting, topModules, weekStart } from './startScreenUtils';
import type { UsageSummary } from '../../../../../shared/usageMetricsTypes';

const at = (h: number) => new Date(2026, 10, 3, h, 0, 0);

describe('tela de início: textos', () => {
  it('saudação pela hora', () => {
    expect(greeting(at(8))).toBe('Bom dia');
    expect(greeting(at(12))).toBe('Boa tarde');
    expect(greeting(at(19))).toBe('Boa noite');
    expect(greeting(at(3))).toBe('Boa noite');
  });

  it('tempo ligado e tempo economizado legíveis', () => {
    expect(formatUptime(8 * 60)).toBe('8 min');
    expect(formatUptime(5 * 3600 + 12 * 60)).toBe('5 h 12 min');
    expect(formatUptime(2 * 86400 + 3 * 3600)).toBe('2 dias e 3 h');
    expect(formatUptime(86400)).toBe('1 dia');
    expect(formatSaved(20_000)).toBe('menos de 1 min');
    expect(formatSaved(40 * 60_000)).toBe('40 min');
    expect(formatSaved(135 * 60_000)).toBe('2 h 15 min');
    expect(formatSaved(120 * 60_000)).toBe('2 h');
  });

  it('a semana são os últimos 7 dias contando hoje, inclusive virando o mês', () => {
    expect(weekStart(new Date(2026, 10, 3))).toBe('2026-10-28');
    expect(weekStart(new Date(2026, 10, 10))).toBe('2026-11-04');
  });

  it('previsão: hoje, amanhã e o dia da semana', () => {
    const now = new Date(2026, 10, 3, 9);
    expect(forecastDayLabel('2026-11-03', now)).toBe('hoje');
    expect(forecastDayLabel('2026-11-04', now)).toBe('amanhã');
    expect(forecastDayLabel('2026-11-05', now)).toBe('qui');
  });
});

describe('tela de início: dados', () => {
  it('módulos mais usados na semana, com o nome do Meu uso', () => {
    const summary = { byModule: [{ module: 'deploy', runs: 2 }, { module: 'zzz', runs: 9 }, { module: 'nada', runs: 0 }] } as unknown as UsageSummary;
    const top = topModules(summary);
    expect(top[0]).toEqual({ label: 'zzz', runs: 9 });
    expect(top).toHaveLength(2);
    expect(topModules(null)).toEqual([]);
  });

  it('ambiente no ar, em parte ou parado', () => {
    const c = (state: string) => ({ name: 'x', image: 'i', state, ports: '' });
    expect(envState({ name: 'a', oracle: c('running'), wta: c('running') })).toBe('up');
    expect(envState({ name: 'a', oracle: c('running'), wta: c('exited') })).toBe('partial');
    expect(envState({ name: 'a', oracle: c('exited'), wta: c('exited') })).toBe('down');
    expect(envState({ name: 'a', wta: c('running') })).toBe('up');
  });
});
