import { describe, expect, it } from 'vitest';
import type { BackupConfig } from '../../shared/types';
import { mergeBackupConfig, validateBackupConfig } from './backupConfigUtils';

const makeConfig = (partial: Partial<BackupConfig> = {}): BackupConfig =>
  ({ connectionId: 'c1', destinationFolder: 'D:\\backups', ...partial }) as BackupConfig;

describe('backupConfigUtils', () => {
  it('valida as expressões cron do backup e do restore drill', () => {
    expect(validateBackupConfig(makeConfig({ cronExpression: '0 2 * * *' }))).toBeNull();
    expect(validateBackupConfig(makeConfig({ cronExpression: 'não é cron' }))).toBe('Expressão cron inválida.');
    expect(validateBackupConfig(makeConfig({ restoreDrillCronExpression: 'x' }))).toBe(
      'Expressão cron de restore drill inválida.'
    );
  });

  it('recusa o drill sobre a própria conexão e o drill agendado sem conexão descartável', () => {
    expect(validateBackupConfig(makeConfig({ restoreDrillScratchConnectionId: 'c1' }))).toContain('própria conexão');
    expect(validateBackupConfig(makeConfig({ restoreDrillCronExpression: '0 4 * * *' }))).toContain('conexão descartável');
    expect(validateBackupConfig(makeConfig({ restoreDrillCronExpression: '0 4 * * *', restoreDrillEnabled: false }))).toBeNull();
    expect(
      validateBackupConfig(makeConfig({ restoreDrillCronExpression: '0 4 * * *', restoreDrillScratchConnectionId: 'c2' }))
    ).toBeNull();
  });

  it('só recusa pasta remota quando pedido', () => {
    const remote = makeConfig({ destinationFolder: '\\\\servidor\\share' });
    expect(validateBackupConfig(remote)).toBeNull();
    expect(validateBackupConfig(remote, { requireLocalDestination: true })).toContain('remota');
  });

  it('mergeBackupConfig preserva campos anteriores e move a conexão para o início', () => {
    const existing = [makeConfig({ connectionId: 'a' }), makeConfig({ connectionId: 'b', retentionCount: 5 })];
    const merged = mergeBackupConfig(existing, makeConfig({ connectionId: 'b', cronExpression: '0 1 * * *' }));
    expect(merged.map((c) => c.connectionId)).toEqual(['b', 'a']);
    expect(merged[0]).toMatchObject({ retentionCount: 5, cronExpression: '0 1 * * *' });
  });
});
