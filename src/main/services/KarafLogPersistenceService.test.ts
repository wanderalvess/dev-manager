import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { KarafLogPersistenceService } from './KarafLogPersistenceService';

describe('KarafLogPersistenceService', () => {
  let tmpDir: string;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;
  let logFilePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-karaf-log-test-'));
    originalConfigDir = process.env.CONFIG_DIR;
    originalAppData = process.env.APPDATA;
    process.env.CONFIG_DIR = tmpDir;
    delete process.env.APPDATA;
    logFilePath = path.join(tmpDir, 'logs', 'karaf-embedded.log');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (originalConfigDir === undefined) delete process.env.CONFIG_DIR;
    else process.env.CONFIG_DIR = originalConfigDir;
    if (originalAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = originalAppData;
  });

  it('cria o diretório de logs na construção', () => {
    new KarafLogPersistenceService();
    expect(fs.existsSync(path.join(tmpDir, 'logs'))).toBe(true);
  });

  it('acumula chunks e devolve o conteúdo completo via read()', () => {
    const service = new KarafLogPersistenceService();
    service.append('linha 1\n');
    service.append('linha 2\n');
    expect(service.read()).toBe('linha 1\nlinha 2\n');
  });

  it('trunca o resultado de read() para os últimos maxChars caracteres', () => {
    const service = new KarafLogPersistenceService();
    service.append('0123456789');
    expect(service.read(4)).toBe('6789');
  });

  it('persiste em disco a cada append, além de manter em memória', () => {
    const service = new KarafLogPersistenceService();
    service.append('persistido');
    expect(fs.readFileSync(logFilePath, 'utf-8')).toBe('persistido');
  });

  it('cai para leitura do arquivo em disco quando a memória está vazia (processo reiniciado)', () => {
    const writer = new KarafLogPersistenceService();
    writer.append('sobrevive ao restart');

    // Nova instância simula um processo reiniciado: ring buffer em memória vazio,
    // mas aponta pro mesmo arquivo em disco (mesmo getAppDataDir()).
    const reader = new KarafLogPersistenceService();
    expect(reader.read()).toBe('sobrevive ao restart');
  });

  it('limita o ring buffer em memória a 500 chunks, descartando os mais antigos', () => {
    const service = new KarafLogPersistenceService();
    for (let i = 0; i < 501; i++) {
      service.append(`chunk-${i}\n`);
    }
    const content = service.read(1_000_000);
    expect(content).not.toContain('chunk-0\n');
    expect(content).toContain('chunk-1\n');
    expect(content).toContain('chunk-500\n');
  });

  it('rotaciona o arquivo para .1 quando excede o tamanho máximo, e recomeça o arquivo principal', () => {
    const service = new KarafLogPersistenceService();
    const bigChunk = 'A'.repeat(6 * 1024 * 1024); // > 5MB (MAX_FILE_BYTES)

    service.append(bigChunk);
    expect(fs.existsSync(`${logFilePath}.1`)).toBe(false);

    service.append('novo conteudo apos rotacao');

    expect(fs.existsSync(`${logFilePath}.1`)).toBe(true);
    expect(fs.readFileSync(`${logFilePath}.1`, 'utf-8').length).toBe(bigChunk.length);
    expect(fs.readFileSync(logFilePath, 'utf-8')).toBe('novo conteudo apos rotacao');
  });

  it('clear() apaga arquivo principal, rotacionado e zera a memória', () => {
    const service = new KarafLogPersistenceService();
    service.append('A'.repeat(6 * 1024 * 1024));
    service.append('gatilho da rotacao');
    expect(fs.existsSync(`${logFilePath}.1`)).toBe(true);

    service.clear();

    expect(service.read()).toBe('');
    expect(fs.existsSync(logFilePath)).toBe(false);
    expect(fs.existsSync(`${logFilePath}.1`)).toBe(false);
  });
});
