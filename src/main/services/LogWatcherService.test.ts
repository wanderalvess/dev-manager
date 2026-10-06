import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { LogWatcherService } from './LogWatcherService';

describe('LogWatcherService', () => {
  let tempDir: string;
  let service: LogWatcherService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-log-test-'));
    service = new LogWatcherService();
  });

  afterEach(() => {
    service.stopAll();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignora erro de remoção de pasta temporária se algum handle estiver pendente
    }
  });

  it('verifica arquivo inexistente corretamente', () => {
    const fakePath = path.join(tempDir, 'inexistente.log');
    const status = service.checkFile(fakePath, 'source-1');
    expect(status.exists).toBe(false);
    expect(status.fileSizeBytes).toBe(0);
  });

  it('verifica arquivo existente e lê linhas iniciais', async () => {
    const logFile = path.join(tempDir, 'service.log');
    fs.writeFileSync(logFile, 'Linha 1\nLinha 2\nLinha 3\nLinha 4\n');

    const status = service.checkFile(logFile, 'source-1');
    expect(status.exists).toBe(true);
    expect(status.fileSizeBytes).toBeGreaterThan(0);

    const { lines } = await service.readLastLines(logFile, 2);
    expect(lines).toEqual(['Linha 3', 'Linha 4']);
  });

  it('inicia monitoramento e detecta novas linhas gravadas', async () => {
    const logFile = path.join(tempDir, 'winthor-test.log');
    fs.writeFileSync(logFile, 'Inicial\n');

    const chunks: string[][] = [];
    const { status, initialLines } = await service.startWatch(
      'winthor-test',
      logFile,
      (event) => {
        chunks.push(event.lines);
      },
      10
    );

    expect(status.exists).toBe(true);
    expect(initialLines).toEqual(['Inicial']);

    // Escreve nova linha no arquivo
    fs.appendFileSync(logFile, 'Nova Linha em Tempo Real\n');

    // Aguarda o ciclo de polling (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.flat()).toContain('Nova Linha em Tempo Real');
  });

  it('recusa zerar arquivo que não é log, mesmo que exista', async () => {
    const notLog = path.join(tempDir, 'config.json');
    fs.writeFileSync(notLog, '{"segredo": true}');

    expect(await service.clearLogFile(notLog)).toBe(false);
    expect(fs.readFileSync(notLog, 'utf-8')).toBe('{"segredo": true}');
  });

  it('não lê nem monitora arquivos dentro da pasta de dados do app', async () => {
    const appData = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-appdata-'));
    const prev = process.env.CONFIG_DIR;
    process.env.CONFIG_DIR = appData;
    try {
      const secret = path.join(appData, 'dados.log');
      fs.writeFileSync(secret, 'segredo\n');

      expect(service.checkFile(secret).exists).toBe(false);
      expect((await service.readLastLines(secret)).lines).toEqual([]);
      expect(await service.clearLogFile(secret)).toBe(false);
      expect(fs.readFileSync(secret, 'utf-8')).toBe('segredo\n');
    } finally {
      if (prev === undefined) delete process.env.CONFIG_DIR;
      else process.env.CONFIG_DIR = prev;
      fs.rmSync(appData, { recursive: true, force: true });
    }
  });

  it('zera o arquivo no disco com clearLogFile', async () => {
    const logFile = path.join(tempDir, 'winthor-zerar.log');
    fs.writeFileSync(logFile, 'Conteudo que deve ser apagado\n');

    const success = await service.clearLogFile(logFile);
    expect(success).toBe(true);

    const content = fs.readFileSync(logFile, 'utf-8');
    expect(content).toBe('');
  });
});
