import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DocsIndexService, chunkText, cosineSimilarity } from './DocsIndexService';
import { ConfigService } from './ConfigService';
import { GitAzureService } from './GitAzureService';

describe('DocsIndexService Algorithms', () => {
  describe('chunkText', () => {
    it('deve retornar array vazio para texto em branco', () => {
      expect(chunkText('')).toEqual([]);
      expect(chunkText('   \n\n   \n\t')).toEqual([]);
    });

    it('deve retornar um único chunk para texto curto menor que 800 caracteres', () => {
      const text = '# Documentação do Módulo\nEste é um guia introdutório sobre o Karaf OSGi.';
      const chunks = chunkText(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('deve agrupar múltiplos parágrafos curtos em um chunk enquanto couber', () => {
      const p1 = 'Primeiro parágrafo do documento.';
      const p2 = 'Segundo parágrafo do documento com mais detalhes.';
      const p3 = 'Terceiro parágrafo de encerramento.';
      const full = `${p1}\n\n${p2}\n\n${p3}`;
      const chunks = chunkText(full);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toContain(p1);
      expect(chunks[0]).toContain(p2);
      expect(chunks[0]).toContain(p3);
    });

    it('deve dividir em múltiplos chunks quando o texto ultrapassar CHUNK_MAX_CHARS (800)', () => {
      const p1 = 'A'.repeat(500);
      const p2 = 'B'.repeat(500);
      const full = `${p1}\n\n${p2}`;
      const chunks = chunkText(full);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain(p1);
      expect(chunks[1]).toContain(p2);
    });

    it('deve quebrar parágrafo único gigante (>1600 caracteres) em janelas fixas com overlap', () => {
      const giant = 'Palavra '.repeat(300); // > 2000 chars
      const chunks = chunkText(giant);
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.length).toBeLessThanOrEqual(1600);
      }
    });
  });

  describe('cosineSimilarity', () => {
    it('deve retornar 1.0 para vetores idênticos', () => {
      const v = [0.2, 0.5, 0.8, -0.1];
      const sim = cosineSimilarity(v, v);
      expect(sim).toBeCloseTo(1.0, 5);
    });

    it('deve retornar 0.0 para vetores perfeitamente ortogonais', () => {
      const v1 = [1, 0, 0];
      const v2 = [0, 1, 0];
      const sim = cosineSimilarity(v1, v2);
      expect(sim).toBeCloseTo(0.0, 5);
    });

    it('deve retornar -1.0 para vetores opostos', () => {
      const v1 = [1, 2, 3];
      const v2 = [-1, -2, -3];
      const sim = cosineSimilarity(v1, v2);
      expect(sim).toBeCloseTo(-1.0, 5);
    });

    it('deve retornar 0 para vetores com norma zero sem gerar NaN', () => {
      const vZero = [0, 0, 0];
      const vNormal = [1, 2, 3];
      const sim = cosineSimilarity(vZero, vNormal);
      expect(sim).toBe(0);
      expect(Number.isNaN(sim)).toBe(false);
    });
  });
});

describe('DocsIndexService Lifecycle and Search', () => {
  let tempDir: string;
  let mockConfigService: any;
  let mockGitService: any;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-docs-test-'));
    vi.stubEnv('APPDATA', tempDir);
    vi.stubEnv('HOME', tempDir);

    mockConfigService = {
      getSettings: vi.fn().mockReturnValue({
        projectsPath: tempDir,
        docFolders: []
      })
    };

    mockGitService = {
      listProjects: vi.fn().mockResolvedValue([])
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('deve inicializar e reportar status vazio se não houver arquivo docs-index.json', () => {
    const service = new DocsIndexService(mockConfigService, mockGitService);
    const status = service.getStatus();
    expect(status.totalChunks).toBe(0);
    expect(status.totalFiles).toBe(0);
    expect(status.totalSources).toBe(0);
    expect(status.sourceLabels).toEqual([]);
    expect(status.lastIndexedAt).toBeUndefined();
  });

  it('deve carregar status corretamente a partir de arquivo de índice salvo', () => {
    const indexPath = path.join(tempDir, 'winthor-dev-manager', 'docs-index.json');
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });

    const indexContent = {
      version: 2,
      updatedAt: '2026-09-06T15:00:00.000Z',
      chunks: [
        {
          id: 'src1::entry1#0',
          sourceId: 'src1',
          sourceLabel: 'Projeto Alpha',
          entryId: 'C:/projects/alpha/README.md',
          entryTitle: 'README.md',
          chunkIndex: 0,
          text: 'Introdução ao Alpha',
          mtimeMs: 123456,
          vector: [0.1, 0.2, 0.3]
        },
        {
          id: 'src1::entry1#1',
          sourceId: 'src1',
          sourceLabel: 'Projeto Alpha',
          entryId: 'C:/projects/alpha/README.md',
          entryTitle: 'README.md',
          chunkIndex: 1,
          text: 'Configuração do banco de dados',
          mtimeMs: 123456,
          vector: [0.2, 0.3, 0.4]
        },
        {
          id: 'src2::entry2#0',
          sourceId: 'src2',
          sourceLabel: 'Projeto Beta',
          entryId: 'C:/projects/beta/docs/manual.md',
          entryTitle: 'manual.md',
          chunkIndex: 0,
          text: 'Guia do usuário Beta',
          mtimeMs: 234567,
          vector: [0.5, 0.5, 0.5]
        }
      ]
    };
    fs.writeFileSync(indexPath, JSON.stringify(indexContent), 'utf-8');

    const service = new DocsIndexService(mockConfigService, mockGitService);
    const status = service.getStatus();

    expect(status.totalChunks).toBe(3);
    expect(status.totalFiles).toBe(2); // 2 arquivos distintos
    expect(status.totalSources).toBe(2); // Projeto Alpha e Projeto Beta
    expect(status.sourceLabels).toEqual(['Projeto Alpha', 'Projeto Beta']);
    expect(status.lastIndexedAt).toBe('2026-09-06T15:00:00.000Z');
  });

  it('deve retornar array vazio na busca se a consulta for vazia', async () => {
    const service = new DocsIndexService(mockConfigService, mockGitService);
    const results = await service.search('   ');
    expect(results).toEqual([]);
  });

  it('deve filtrar por sourceLabel quando especificado nas opções de busca', async () => {
    const indexPath = path.join(tempDir, 'winthor-dev-manager', 'docs-index.json');
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });

    const indexContent = {
      version: 2,
      updatedAt: '2026-09-06T15:00:00.000Z',
      chunks: [
        {
          id: 'src1::entry1#0',
          sourceId: 'src1',
          sourceLabel: 'Projeto Alpha',
          entryId: 'C:/projects/alpha/README.md',
          entryTitle: 'README.md',
          chunkIndex: 0,
          text: 'Karaf deployer instructions',
          mtimeMs: 123456,
          vector: [1, 0, 0]
        },
        {
          id: 'src2::entry2#0',
          sourceId: 'src2',
          sourceLabel: 'Projeto Beta',
          entryId: 'C:/projects/beta/docs/manual.md',
          entryTitle: 'manual.md',
          chunkIndex: 0,
          text: 'Karaf deployer instructions',
          mtimeMs: 234567,
          vector: [0.9, 0.1, 0]
        }
      ]
    };
    fs.writeFileSync(indexPath, JSON.stringify(indexContent), 'utf-8');

    const service = new DocsIndexService(mockConfigService, mockGitService);
    // Simula embedQuery para não precisar carregar o modelo ONNX em teste unitário
    (service as any).embedQuery = vi.fn().mockResolvedValue([1, 0, 0]);

    const results = await service.search('Karaf deployer', { sourceLabel: 'Projeto Alpha' });
    expect(results.length).toBe(1);
    expect(results[0].chunk.sourceLabel).toBe('Projeto Alpha');
    expect((results[0].chunk as any).vector).toBeUndefined(); // stripVector removeu o vetor
    expect(results[0].score).toBeCloseTo(1.0, 5);
  });
});
