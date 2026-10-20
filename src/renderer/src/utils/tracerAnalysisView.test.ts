import { describe, expect, it } from 'vitest';
import { formatTracerMs, repeatKindInfo, routineHeading } from './tracerAnalysisView';

describe('formatTracerMs', () => {
  it('escolhe a unidade pela ordem de grandeza', () => {
    expect(formatTracerMs(0.4)).toBe('0,40 ms');
    expect(formatTracerMs(12.4)).toBe('12 ms');
    expect(formatTracerMs(1300)).toBe('1,3 s');
    expect(formatTracerMs(125000)).toBe('2 min 5 s');
  });
});

describe('routineHeading', () => {
  it('destaca o número da rotina quando existe', () => {
    expect(routineHeading('PCSIS2075', '2075')).toBe('Rotina 2075 (PCSIS2075)');
    expect(routineHeading('JDBC Thin Client', null)).toBe('JDBC Thin Client');
  });
});

describe('repeatKindInfo', () => {
  it('explica cada tipo de repetição', () => {
    expect(repeatKindInfo('literal-variants').hint).toContain('bind');
    expect(repeatKindInfo('many-executions').title).toContain('muitas vezes');
  });
});
