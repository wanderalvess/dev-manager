import { describe, it, expect } from 'vitest';
import {
  normalizeRoutineTarget,
  buildCcwDownloadUrl,
  formatCcwCycleVersion,
  DEFAULT_CCW_WINTHOR_VERSION,
  DEFAULT_CCW_WINTHOR_CYCLES,
  deduceModuleNumber,
  formatModuleFolderName
} from './ccwRoutineCommon';

describe('ccwRoutineCommon', () => {
  describe('normalizeRoutineTarget', () => {
    it('normaliza número simples para PCSIS', () => {
      expect(normalizeRoutineTarget('132')).toEqual({
        code: '132',
        baseName: 'PCSIS132',
        fileName: 'PCSIS132.EXE'
      });
    });

    it('preserva PCSIS maiúsculo e minúsculo com .exe', () => {
      expect(normalizeRoutineTarget('pcsis316.exe')).toEqual({
        code: '316',
        baseName: 'PCSIS316',
        fileName: 'PCSIS316.EXE'
      });
    });

    it('trata prefixo PC (ex: PC1406)', () => {
      expect(normalizeRoutineTarget('PC1406')).toEqual({
        code: '1406',
        baseName: 'PC1406',
        fileName: 'PC1406.EXE'
      });
    });

    it('trata caso especial PCINFTAB como rotina 560', () => {
      expect(normalizeRoutineTarget('PCINFTAB')).toEqual({
        code: '560',
        baseName: 'PCINFTAB',
        fileName: 'PCINFTAB.EXE'
      });
    });

    it('trata prefixo ROTINA', () => {
      expect(normalizeRoutineTarget('ROTINA529')).toEqual({
        code: '529',
        baseName: 'PCSIS529',
        fileName: 'PCSIS529.EXE'
      });
    });

    it('trata entrada vazia', () => {
      expect(normalizeRoutineTarget('')).toEqual({
        code: null,
        baseName: '',
        fileName: ''
      });
    });
  });

  describe('formatCcwCycleVersion', () => {
    it('normaliza número inteiro para XX.00', () => {
      expect(formatCcwCycleVersion('37')).toBe('37.00');
      expect(formatCcwCycleVersion('38')).toBe('38.00');
    });

    it('preserva formato com ponto XX.00', () => {
      expect(formatCcwCycleVersion('37.00')).toBe('37.00');
      expect(formatCcwCycleVersion('38.00')).toBe('38.00');
    });

    it('extrai ciclo a partir de versão completa de 4 dígitos', () => {
      expect(formatCcwCycleVersion('37.00.00.028')).toBe('37.00');
      expect(formatCcwCycleVersion('38.00.00.002')).toBe('38.00');
    });

    it('usa padrão 37.00 quando vazio', () => {
      expect(formatCcwCycleVersion('')).toBe(DEFAULT_CCW_WINTHOR_VERSION);
    });
  });

  describe('buildCcwDownloadUrl', () => {
    it('gera URL oficial da CCW com dependências por padrão', () => {
      const url = buildCcwDownloadUrl('https://centraldecontrole.pcinformatica.com.br', 'PCSIS301', '37.00');
      expect(url).toBe('https://centraldecontrole.pcinformatica.com.br/api/rotinas/rotinaVersaoComDependencia/PCSIS301/37.00/0/P');
    });

    it('normaliza número simples na rota moderna com dependência', () => {
      const url = buildCcwDownloadUrl(undefined, 'PCSIS132', '37');
      expect(url).toBe('https://centraldecontrole.pcinformatica.com.br/api/rotinas/rotinaVersaoComDependencia/PCSIS132/37.00/0/P');
    });

    it('suporta modo legado para rotinas antigas', () => {
      const url = buildCcwDownloadUrl('https://centraldecontrole.pcinformatica.com.br', 'PCSIS132', '30', 'legacy');
      expect(url).toBe('https://centraldecontrole.pcinformatica.com.br/api/rotinas/downloadRotina/PCSIS132/30/');
    });
  });

  describe('deduceModuleNumber e formatModuleFolderName', () => {
    it('deduz módulo dividindo por 100', () => {
      expect(deduceModuleNumber('132')).toBe(1);
      expect(deduceModuleNumber('316')).toBe(3);
      expect(deduceModuleNumber('530')).toBe(5);
      expect(deduceModuleNumber('1406')).toBe(14);
      expect(deduceModuleNumber('abc')).toBeNull();
      expect(deduceModuleNumber(null)).toBeNull();
    });

    it('formata pasta do módulo com padding de 3 dígitos', () => {
      expect(formatModuleFolderName(1)).toBe('MOD-001');
      expect(formatModuleFolderName(3)).toBe('MOD-003');
      expect(formatModuleFolderName(14)).toBe('MOD-014');
    });
  });
});
