import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ScenarioRunRecord } from '../../../shared/scenarioHistoryTypes';
import { isSafeRunId, ScenarioHistoryStore } from './scenarioHistoryStore';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-runs-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const record = (id: string, minute: number): ScenarioRunRecord => {
  const startedAt = new Date(Date.UTC(2026, 9, 30, 10, minute)).toISOString();
  return { id, kind: 'api', name: `Cenário ${id}`, startedAt, finishedAt: startedAt, durationMs: 0, verdict: 'passed', summary: 'OK · 1 de 1' };
};

describe('ScenarioHistoryStore', () => {
  it('guarda, lista do mais recente para o mais antigo e devolve o registro completo', async () => {
    const store = new ScenarioHistoryStore(path.join(dir, 'runs'));
    await store.save(record('r-a', 1));
    await store.save(record('r-b', 2));
    expect((await store.list()).map((r) => r.id)).toEqual(['r-b', 'r-a']);
    expect(await store.get('r-a')).toMatchObject({ name: 'Cenário r-a' });
  });

  it('mantém só as últimas N execuções', async () => {
    const store = new ScenarioHistoryStore(dir, 3);
    for (let i = 0; i < 5; i++) await store.save(record(`r-${i}`, i));
    expect((await store.list()).map((r) => r.id)).toEqual(['r-4', 'r-3', 'r-2']);
    expect(fs.readdirSync(dir).sort()).toEqual(['r-2.json', 'r-3.json', 'r-4.json']);
  });

  it('ignora arquivo corrompido ou de outro formato em vez de quebrar a lista', async () => {
    const store = new ScenarioHistoryStore(dir);
    await store.save(record('r-ok', 1));
    fs.writeFileSync(path.join(dir, 'r-quebrado.json'), '{ não é json');
    fs.writeFileSync(path.join(dir, 'r-outro.json'), JSON.stringify({ id: 'r-outro', kind: 'desconhecido' }));
    expect((await store.list()).map((r) => r.id)).toEqual(['r-ok']);
    expect(await store.get('r-quebrado')).toBeNull();
  });

  it('recusa identificador que sairia da pasta', async () => {
    const store = new ScenarioHistoryStore(dir);
    for (const id of ['../config', '..', 'a/b', 'a\\b', '', '-x']) expect(isSafeRunId(id)).toBe(false);
    await expect(store.save(record('../fora', 1))).rejects.toThrow('inválido');
    expect(await store.get('../config')).toBeNull();
    expect(await store.remove('../config')).toBe(false);
  });

  it('apaga uma e limpa tudo; sem pasta, lista vazia', async () => {
    const store = new ScenarioHistoryStore(dir);
    await store.save(record('r-a', 1));
    await store.save(record('r-b', 2));
    expect(await store.remove('r-a')).toBe(true);
    expect(await store.remove('r-a')).toBe(false);
    expect(await store.clear()).toBe(1);
    expect(await store.list()).toEqual([]);
    expect(await new ScenarioHistoryStore(path.join(dir, 'nao-existe')).list()).toEqual([]);
  });
});
