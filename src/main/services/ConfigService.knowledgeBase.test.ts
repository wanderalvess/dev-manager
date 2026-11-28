import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigService } from './ConfigService';

describe('ConfigService — chave da Base de Conhecimento', () => {
  let tmpDir: string;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-kb-'));
    originalConfigDir = process.env.CONFIG_DIR;
    originalAppData = process.env.APPDATA;
    process.env.CONFIG_DIR = tmpDir;
    delete process.env.APPDATA;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (originalConfigDir === undefined) delete process.env.CONFIG_DIR;
    else process.env.CONFIG_DIR = originalConfigDir;
    if (originalAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = originalAppData;
  });

  const kb = (apiKey: string, baseUrl = 'https://kb.example.com') => ({
    knowledgeBase: { enabled: true, baseUrl, apiKey }
  });

  it('grava a chave criptografada e devolve texto plano em getSettings', () => {
    const service = new ConfigService();
    service.saveSettings(kb('chave-kb-secreta-123'));

    expect(fs.readFileSync(service.getConfigFilePath(), 'utf-8')).not.toContain('chave-kb-secreta-123');
    expect(service.getSettings().knowledgeBase?.apiKey).toBe('chave-kb-secreta-123');
  });

  it('sanitizeSecrets esconde a chave mas informa que ela existe', () => {
    const service = new ConfigService();
    service.saveSettings(kb('chave-kb-secreta-123'));

    const sanitized = service.sanitizeSecrets(service.getSettings());
    expect(sanitized.knowledgeBase?.apiKey).toBe('');
    expect(sanitized.hasKnowledgeBaseKey).toBe(true);
  });

  it('preserva a chave quando o cliente reenvia vazio com a mesma URL, e apaga se a URL mudar', () => {
    const service = new ConfigService();
    service.saveSettings(kb('chave-original'));

    const same = service.saveSettings(kb('', 'https://kb.example.com'));
    expect(same.knowledgeBase?.apiKey).toBe('chave-original');

    const moved = service.saveSettings(kb('', 'https://outro.example.com'));
    expect(moved.knowledgeBase?.apiKey).toBe('');
  });
});
