import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DocsIndexService, DocSyncService, chunkText, cosineSimilarity, textRelevanceScore, computeArticleId, sanitizeDocPathInfo } from './DocsIndexService';
import { ConfigService } from './ConfigService';
import { GitAzureService } from './GitAzureService';
import { DocSyncTargetConfig } from '../../shared/types';

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
    const indexPath = path.join(tempDir, 'dev-manager', 'docs-index.json');
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
    expect(status.files?.length).toBe(2);
    expect(status.lastIndexedAt).toBe('2026-09-06T15:00:00.000Z');
  });

  it('deve retornar array vazio na busca se a consulta for vazia', async () => {
    const service = new DocsIndexService(mockConfigService, mockGitService);
    const results = await service.search('   ');
    expect(results).toEqual([]);
  });

  it('deve filtrar por sourceLabel quando especificado nas opções de busca', async () => {
    const indexPath = path.join(tempDir, 'dev-manager', 'docs-index.json');
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
    // Simula embedQuery e isModelDownloaded para não precisar baixar/carregar o modelo ONNX em teste unitário
    vi.spyOn(service, 'isModelDownloaded').mockReturnValue(true);
    (service as any).embedQuery = vi.fn().mockResolvedValue([1, 0, 0]);

    const results = await service.search('Karaf deployer', { sourceLabel: 'Projeto Alpha' });
    expect(results.length).toBe(1);
    expect(results[0].chunk.sourceLabel).toBe('Projeto Alpha');
    expect((results[0].chunk as any).vector).toBeUndefined(); // stripVector removeu o vetor
    expect(results[0].score).toBeCloseTo(1.0, 5);
  });

  it('deve realizar busca textual como fallback quando chunks não possuem vetores', async () => {
    const indexPath = path.join(tempDir, 'dev-manager', 'docs-index.json');
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });

    const indexContent = {
      version: 2,
      updatedAt: '2026-09-10T10:00:00.000Z',
      chunks: [
        {
          id: 'src1::entry1#0',
          sourceId: 'src1',
          sourceLabel: 'prompt-hub',
          entryId: 'C:/docs/api-estoque.md',
          entryTitle: 'api-estoque.md',
          chunkIndex: 0,
          text: 'Documentação da API de sincronização de estoque vtex com o ERP WinThor.',
          mtimeMs: 123456,
          vector: []
        },
        {
          id: 'src1::entry2#0',
          sourceId: 'src1',
          sourceLabel: 'prompt-hub',
          entryId: 'C:/docs/api-fiscal.md',
          entryTitle: 'api-fiscal.md',
          chunkIndex: 0,
          text: 'Conversor XML para emissão de nota fiscal eletrônica.',
          mtimeMs: 123456,
          vector: []
        }
      ]
    };
    fs.writeFileSync(indexPath, JSON.stringify(indexContent), 'utf-8');

    const service = new DocsIndexService(mockConfigService, mockGitService);
    const status = service.getStatus();
    expect(status.isTextOnly).toBe(true);

    const results = await service.search('estoque vtex');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].chunk.entryTitle).toBe('api-estoque.md');
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it('não deve varrer projetos git se indexProjectsDocs estiver desativado', async () => {
    mockConfigService.getSettings.mockReturnValue({
      projectsPath: tempDir,
      docFolders: [],
      indexProjectsDocs: false
    });

    const service = new DocsIndexService(mockConfigService, mockGitService);
    await service.reindex();
    expect(mockGitService.listProjects).not.toHaveBeenCalled();
  });

  it('deve varrer projetos git se indexProjectsDocs estiver ativado', async () => {
    mockConfigService.getSettings.mockReturnValue({
      projectsPath: tempDir,
      docFolders: [],
      indexProjectsDocs: true
    });

    const service = new DocsIndexService(mockConfigService, mockGitService);
    await service.reindex();
    expect(mockGitService.listProjects).toHaveBeenCalled();
  });
});

describe('textRelevanceScore Algorithm', () => {
  it('deve retornar 0 se a query for vazia', () => {
    expect(textRelevanceScore('', 'texto qualquer', 'titulo')).toBe(0);
    expect(textRelevanceScore('   ', 'texto qualquer', 'titulo')).toBe(0);
  });

  it('deve retornar alta pontuação se a consulta estiver no título', () => {
    const score = textRelevanceScore('estoque', 'qualquer conteudo', 'api-estoque-vtex.md');
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it('deve pontuar correspondência no texto quando não estiver no título', () => {
    const score = textRelevanceScore('sincronização', 'processo de sincronização de dados', 'manual.md');
    expect(score).toBeGreaterThan(0.5);
  });

  it('deve retornar 0 quando não houver nenhuma correspondência', () => {
    const score = textRelevanceScore('tributação pis cofins', 'este documento fala apenas de telas delphi', 'relatorio.md');
    expect(score).toBe(0);
  });
});

describe('DocSyncService', () => {
  it('deve retornar erro se nenhum destino estiver configurado ou habilitado', async () => {
    const mockConfigService = {
      getSettings: vi.fn().mockReturnValue({ docSyncTargets: [] }),
      saveSettings: vi.fn()
    } as unknown as ConfigService;

    const mockDocsIndexService = {
      getIndexChunks: vi.fn().mockReturnValue([])
    } as unknown as DocsIndexService;

    const syncService = new DocSyncService(mockConfigService, mockDocsIndexService);
    const results = await syncService.syncToTarget();
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Nenhum destino de sincronização habilitado');
  });

  it('deve retornar erro se não existirem chunks indexados para envio', async () => {
    const target: DocSyncTargetConfig = {
      id: 'target-1',
      name: 'Espaço Ágil Test',
      endpointUrl: 'https://api.test/sync',
      enabled: true
    };

    const mockConfigService = {
      getSettings: vi.fn().mockReturnValue({ docSyncTargets: [target] }),
      saveSettings: vi.fn()
    } as unknown as ConfigService;

    const mockDocsIndexService = {
      getIndexChunks: vi.fn().mockReturnValue([])
    } as unknown as DocsIndexService;

    const syncService = new DocSyncService(mockConfigService, mockDocsIndexService);
    const results = await syncService.syncToTarget('target-1');
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Nenhum documento indexado encontrado');
  });

  it('deve fatiar chunks em lotes (batchSize) e disparar requisições com headers corretos', async () => {
    const target: DocSyncTargetConfig = {
      id: 'target-api',
      name: 'Agile Space API',
      endpointUrl: 'https://espacoagil.com.br/api/v1/knowledge/sync',
      method: 'POST',
      authHeader: 'X-Api-Key',
      authValue: 'secret_123',
      batchSize: 2,
      enabled: true
    };

    const mockConfigService = {
      getSettings: vi.fn().mockReturnValue({ docSyncTargets: [target] }),
      saveSettings: vi.fn().mockResolvedValue({})
    } as unknown as ConfigService;

    const sampleChunks = [
      { id: '1', sourceId: 'src1', sourceLabel: 'Src', entryId: 'f1', entryTitle: 't1', chunkIndex: 0, text: 'c1', vector: [0.1, 0.2], mtimeMs: 100 },
      { id: '2', sourceId: 'src1', sourceLabel: 'Src', entryId: 'f1', entryTitle: 't1', chunkIndex: 1, text: 'c2', vector: [0.3, 0.4], mtimeMs: 100 },
      { id: '3', sourceId: 'src1', sourceLabel: 'Src', entryId: 'f2', entryTitle: 't2', chunkIndex: 0, text: 'c3', vector: [0.5, 0.6], mtimeMs: 200 }
    ];

    const mockDocsIndexService = {
      getIndexChunks: vi.fn().mockReturnValue(sampleChunks)
    } as unknown as DocsIndexService;

    const syncService = new DocSyncService(mockConfigService, mockDocsIndexService);
    const requestCalls: any[] = [];
    (syncService as any).httpRequest = vi.fn().mockImplementation(async (url, opts) => {
      requestCalls.push({ url, opts });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ success: true })
      };
    });

    const progressList: any[] = [];
    const results = await syncService.syncToTarget('target-api', (p) => progressList.push(p));

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].totalChunksSent).toBe(3);
    expect(results[0].totalArticlesSent).toBe(2); // f1 e f2
    expect(results[0].totalBatches).toBe(2);

    // Deve ter chamado o httpRequest 2 vezes (lote 1 com 2 chunks, lote 2 com 1 chunk)
    expect(requestCalls).toHaveLength(2);

    const call1Headers = requestCalls[0].opts.headers;
    expect(call1Headers['X-Api-Key']).toBe('secret_123');

    const call1Body = JSON.parse(requestCalls[0].opts.body);
    expect(call1Body.chunks).toHaveLength(2);
    expect(call1Body.chunks[0].articleId).toBeDefined();
    expect(call1Body.chunks[0].articleId).toBe(call1Body.chunks[1].articleId); // Ambos são de f1
    expect(call1Body.articles).toBeDefined();
    expect(call1Body.batchIndex).toBe(1);
    expect(call1Body.totalBatches).toBe(2);

    const call2Body = JSON.parse(requestCalls[1].opts.body);
    expect(call2Body.chunks).toHaveLength(1);
    expect(call2Body.batchIndex).toBe(2);

    // Deve ter persistido lastSyncedAt
    expect(mockConfigService.saveSettings).toHaveBeenCalled();
  });

  describe('Sanitization & Deterministic IDs', () => {
    it('deve gerar articleId exclusivo para cada arquivo mesmo com mesmo sourceId longo', () => {
      const sourceId = 'local-folder:C:\\Users\\wanderson.alves\\projetosTOTVS\\prompt-hub\\docs';
      const id1 = computeArticleId(sourceId, 'hub-carga-dados\\diagnostico.md');
      const id2 = computeArticleId(sourceId, 'PCINF000MOB\\diagnostico.md');
      const id3 = computeArticleId(sourceId, 'hub-carga-dados/diagnostico.md'); // mesma rota com barra normalizada

      expect(id1).toMatch(/^doc_[a-f0-9]{24}$/);
      expect(id2).toMatch(/^doc_[a-f0-9]{24}$/);
      expect(id1).not.toBe(id2);
      expect(id1).toBe(id3); // normalização garante idêntico
    });

    it('deve sanitizar paths de disco e nunca vazar caminhos locais em tags, category ou fullPath', () => {
      const rawSourceLabel = 'C:\\Users\\wanderson.alves\\projetosTOTVS\\prompt-hub\\docs';
      const rawEntryTitle = 'hub-carga-dados\\diagnostico-projeto-hub-carga-dados.md';

      const sanitized = sanitizeDocPathInfo(rawSourceLabel, rawEntryTitle);

      expect(sanitized.cleanProjectName).toBe('hub-carga-dados');
      expect(sanitized.cleanSourceLabel).toBe('prompt-hub');
      expect(sanitized.cleanTitle).toBe('hub-carga-dados/diagnostico-projeto-hub-carga-dados.md');
      expect(sanitized.category).toBe('hub-carga-dados');
      expect(sanitized.fullPath).toBe('Documentação / hub-carga-dados / hub-carga-dados/diagnostico-projeto-hub-carga-dados.md');

      // Nenhuma tag pode ter caminho de disco ou dois pontos
      expect(sanitized.tags).toContain('DevManager');
      expect(sanitized.tags).toContain('hub-carga-dados');
      for (const tag of sanitized.tags) {
        expect(tag).not.toContain('C:');
        expect(tag).not.toContain('\\');
        expect(tag).not.toContain('/');
      }
    });

    it('deve extrair nome da pasta pai quando a pasta for genérica como "docs"', () => {
      const rawSourceLabel = 'C:/workspace/my-microservice/docs';
      const rawEntryTitle = 'README.md';

      const sanitized = sanitizeDocPathInfo(rawSourceLabel, rawEntryTitle);
      expect(sanitized.cleanProjectName).toBe('my-microservice');
      expect(sanitized.category).toBe('my-microservice');
      expect(sanitized.tags).toEqual(['DevManager', 'my-microservice']);
    });
  });
});
