import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeBaseImportService } from './KnowledgeBaseImportService';
import type { KnowledgeBaseClient } from './KnowledgeBaseClient';

const dirs: string[] = [];
function makeRepo(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-import-'));
  dirs.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
  }
  return root;
}

afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('KnowledgeBaseImportService', () => {
  it('envia só documentos reconhecidos e agrega o resultado dos lotes', async () => {
    const root = makeRepo({
      'prompts/p.md': '# Prompt\ncorpo',
      'docs/Documentações TDN/t.txt': 'texto tdn',
      'README.md': '# ignorado',
      '.git/config': 'x',
      'prompts/vazio.md': ''
    });
    const ingest = vi.fn().mockImplementation(async (items: unknown[]) => ({
      created: items.length,
      updated: 0,
      unchanged: 0,
      errors: 0,
      results: []
    }));
    const service = new KnowledgeBaseImportService({ ingest } as unknown as KnowledgeBaseClient);
    const onProgress = vi.fn();

    const summary = await service.importFolder(root, { version: 'v1', onProgress });

    expect(ingest).toHaveBeenCalledTimes(1);
    expect(ingest.mock.calls[0][0].map((i: { docType: string }) => i.docType).sort()).toEqual(['prompt', 'tdn_page']);
    expect(summary).toMatchObject({ created: 2, skipped: 2, errors: 0 });
    expect(onProgress).toHaveBeenLastCalledWith({ sent: 2, total: 2 });
  });

  it('reporta falhas e avisos por documento', async () => {
    const root = makeRepo({ 'prompts/p.md': '# P\ncorpo' });
    const ingest = vi.fn().mockResolvedValue({
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: 1,
      results: [{ docType: 'prompt', externalId: 'prompts/p.md', status: 'error', message: 'ruim', warnings: ['w'] }]
    });
    const service = new KnowledgeBaseImportService({ ingest } as unknown as KnowledgeBaseClient);
    const summary = await service.importFolder(root);
    expect(summary.failures).toHaveLength(1);
    expect(summary.warnings).toEqual(['prompts/p.md: w']);
  });

  it('falha com pasta inexistente', () => {
    const service = new KnowledgeBaseImportService({} as KnowledgeBaseClient);
    expect(() => service.collect(path.join(os.tmpdir(), 'nao-existe-kb'))).toThrow(/Pasta do prompt-hub/);
  });
});
