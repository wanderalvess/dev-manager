import { describe, expect, it } from 'vitest';
import {
  formatRoutineExtensions,
  parseRoutineExtensions,
  parseWinthorStartPort
} from './dirsTabParsers';

describe('parseRoutineExtensions', () => {
  it('normaliza com ponto e caixa alta', () => {
    expect(parseRoutineExtensions('exe, .bat')).toEqual(['.EXE', '.BAT']);
  });

  it('ignora entradas vazias', () => {
    expect(parseRoutineExtensions(' , ,')).toEqual([]);
  });
});

describe('formatRoutineExtensions', () => {
  it('usa .EXE como padrão', () => {
    expect(formatRoutineExtensions(undefined)).toBe('.EXE');
  });

  it('junta com vírgula e espaço', () => {
    expect(formatRoutineExtensions(['.EXE', '.PC'])).toBe('.EXE, .PC');
  });
});

describe('parseWinthorStartPort', () => {
  it('converte número válido', () => {
    expect(parseWinthorStartPort('8080')).toBe(8080);
  });

  it('volta ao padrão quando inválido ou zero', () => {
    expect(parseWinthorStartPort('')).toBe(9195);
    expect(parseWinthorStartPort('abc')).toBe(9195);
    expect(parseWinthorStartPort('0')).toBe(9195);
  });
});
