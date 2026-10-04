import { describe, expect, it } from 'vitest';
import {
  appendCommandTag,
  buildBackupHistoryCsv,
  buildBackupHistoryCsvFilename,
  formatBytes,
  getBackupCommandPresets,
  getDefaultDbPort,
  hasBackupFileTag,
  normalizeWebhook,
  parseOptionalNumber,
  toggleWebhookEvent,
  upsertBackupConfig,
  upsertWebhook
} from './backupModalUtils';
import type { BackupConfig, BackupHistoryEntry, BackupWebhookConfig } from '../../../shared/types';

function makeHistory(overrides: Partial<BackupHistoryEntry> = {}): BackupHistoryEntry {
  return {
    id: 'h1',
    connectionId: 'c1',
    connectionName: 'Banco',
    action: 'backup',
    trigger: 'manual',
    success: true,
    message: 'ok "aspas"',
    startedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  } as BackupHistoryEntry;
}

function makeWebhook(overrides: Partial<BackupWebhookConfig> = {}): BackupWebhookConfig {
  return { id: 'w1', name: 'Hook', endpointUrl: 'https://x.test', enabled: true, ...overrides };
}

describe('backupModalUtils', () => {
  it('formata bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });

  it('resolve porta padrão por tipo', () => {
    expect(getDefaultDbPort('oracle')).toBe(1521);
    expect(getDefaultDbPort('mysql')).toBe(3306);
    expect(getDefaultDbPort('postgres')).toBe(5432);
  });

  it('valida tag de arquivo no comando', () => {
    expect(hasBackupFileTag('x {filePath}')).toBe(true);
    expect(hasBackupFileTag('x {fileName}')).toBe(true);
    expect(hasBackupFileTag('x {folder}')).toBe(false);
  });

  it('lista presets por tipo', () => {
    expect(getBackupCommandPresets('oracle')).toHaveLength(3);
    expect(getBackupCommandPresets('mysql')).toHaveLength(2);
    expect(getBackupCommandPresets('postgres')).toHaveLength(2);
  });

  it('acrescenta tag com espaço apenas se houver conteúdo', () => {
    expect(appendCommandTag('', '{user}')).toBe('{user}');
    expect(appendCommandTag('cmd', '{user}')).toBe('cmd {user}');
  });

  it('gera CSV com escape de aspas e CRLF', () => {
    const csv = buildBackupHistoryCsv([makeHistory({ sizeBytes: 10 })]);
    const lines = csv.split('\r\n');
    expect(lines[0].startsWith('startedAt,action')).toBe(true);
    expect(lines[1]).toContain('"ok ""aspas"""');
    expect(lines[1]).toContain('"10"');
  });

  it('sanitiza nome do arquivo CSV', () => {
    const name = buildBackupHistoryCsvFilename('Meu Banco/1', new Date('2026-02-03T10:00:00Z'));
    expect(name).toBe('backup-history_Meu_Banco_1_2026-02-03.csv');
    expect(buildBackupHistoryCsvFilename(undefined, new Date('2026-02-03T10:00:00Z'))).toContain('conexao');
  });

  it('upsert de config move a conexão para o início', () => {
    const a: BackupConfig = { connectionId: 'a', destinationFolder: '1' };
    const b: BackupConfig = { connectionId: 'b', destinationFolder: '2' };
    const result = upsertBackupConfig([a, b], { connectionId: 'b', destinationFolder: '3' });
    expect(result.map((r) => r.connectionId)).toEqual(['b', 'a']);
    expect(result[0].destinationFolder).toBe('3');
  });

  it('parseia número opcional', () => {
    expect(parseOptionalNumber('  ')).toBeUndefined();
    expect(parseOptionalNumber(' 7 ')).toBe(7);
  });

  it('normaliza webhook com defaults', () => {
    const w = normalizeWebhook({ name: ' A ', endpointUrl: ' https://x ', events: [] }, 123);
    expect(w).toMatchObject({ id: 'webhook_123', name: 'A', endpointUrl: 'https://x', method: 'POST', enabled: true, platform: 'generic' });
    expect(w.events).toBeUndefined();
  });

  it('upsert de webhook', () => {
    const list = [makeWebhook()];
    expect(upsertWebhook(list, makeWebhook({ name: 'Novo' }), true)[0].name).toBe('Novo');
    expect(upsertWebhook(list, makeWebhook({ id: 'w2' }), false)).toHaveLength(2);
  });

  it('alterna eventos do webhook', () => {
    expect(toggleWebhookEvent(undefined, 'success', false)).toEqual(['failure']);
    expect(toggleWebhookEvent(['success'], 'failure', true)).toEqual(['success', 'failure']);
  });
});
