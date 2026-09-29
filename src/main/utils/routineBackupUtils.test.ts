import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatBackupDate,
  parseBackupFileName,
  isBackupForRoutine,
  createPreRollbackBackupPath
} from './routineBackupUtils';

describe('routineBackupUtils', () => {
  it('formata bytes em KB e MB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB');
  });

  it('formata objeto Date no formato DD/MM/AAAA HH:MM:SS', () => {
    const d = new Date(2026, 8, 29, 14, 30, 0); // 29 de setembro de 2026
    expect(formatBackupDate(d)).toBe('29/09/2026 14:30:00');
  });

  it('faz o parsing de nome de backup com timestamp', () => {
    const parsed = parseBackupFileName('PCSIS132_20260929_113000.bak');
    expect(parsed.baseRoutineName).toBe('PCSIS132');
    expect(parsed.isPreRollback).toBe(false);
    expect(parsed.parsedDate).not.toBeNull();
    expect(parsed.parsedDate?.getFullYear()).toBe(2026);
    expect(parsed.parsedDate?.getMonth()).toBe(8); // Setembro = 8 (0-indexed)
    expect(parsed.parsedDate?.getDate()).toBe(29);
  });

  it('identifica backup pré-rollback', () => {
    const parsed = parseBackupFileName('PCSIS132_20260929_113000_pre_rollback.bak');
    expect(parsed.baseRoutineName).toBe('PCSIS132');
    expect(parsed.isPreRollback).toBe(true);
  });

  it('identifica corretamente se o arquivo de backup pertence à rotina', () => {
    expect(isBackupForRoutine('PCSIS132_20260929_113000.bak', 'PCSIS132.EXE')).toBe(true);
    expect(isBackupForRoutine('PCSIS132_20260929_113000.bak', '132')).toBe(false);
    expect(isBackupForRoutine('PCSIS529_20260929_113000.bak', 'PCSIS132.EXE')).toBe(false);
    expect(isBackupForRoutine('readme.txt', 'PCSIS132.EXE')).toBe(false);
  });

  it('gera caminho de backup com tag _pre_rollback', () => {
    const original = 'C:\\Winthor\\Prod\\MOD-001\\PCSIS132.EXE';
    const preRollback = createPreRollbackBackupPath(original);
    expect(preRollback).toContain('PCSIS132_');
    expect(preRollback).toContain('_pre_rollback.bak');
  });
});
