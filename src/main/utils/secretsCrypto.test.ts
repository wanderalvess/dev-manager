import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { decryptSecret, encryptSecret } from './secretsCrypto';

describe('secretsCrypto', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-crypto-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('não grava o segredo em texto plano quando a criptografia falha (fail-closed)', () => {
    // configDir aponta para um arquivo: a chave não pode ser criada ali
    const notADir = path.join(tmpDir, 'arquivo.txt');
    fs.writeFileSync(notADir, 'x');
    expect(() => encryptSecret('segredo', path.join(notADir, 'sub'))).toThrow(/criptografar/);
  });

  it('criptografa e descriptografa de volta ao valor original', () => {
    const encrypted = encryptSecret('minha-senha-super-secreta', tmpDir);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe('minha-senha-super-secreta');
    expect(decryptSecret(encrypted, tmpDir)).toBe('minha-senha-super-secreta');
  });

  it('prefixa o valor criptografado com "enc:v1:"', () => {
    const encrypted = encryptSecret('segredo', tmpDir);
    expect(encrypted!.startsWith('enc:v1:')).toBe(true);
  });

  it('retorna undefined/vazio inalterado, sem criptografar', () => {
    expect(encryptSecret(undefined, tmpDir)).toBeUndefined();
    expect(encryptSecret('', tmpDir)).toBe('');
  });

  it('trata valor sem o prefixo "enc:v1:" como texto plano já existente (compatibilidade)', () => {
    expect(decryptSecret('senha-antiga-em-texto-puro', tmpDir)).toBe('senha-antiga-em-texto-puro');
    expect(decryptSecret(undefined, tmpDir)).toBeUndefined();
    expect(decryptSecret('', tmpDir)).toBe('');
  });

  it('reutiliza a mesma chave entre chamadas (persistida em arquivo)', () => {
    const encrypted1 = encryptSecret('valor-1', tmpDir);
    // Simula um segundo processo/chamada que não tem a chave em cache de memória:
    // ainda deve conseguir descriptografar porque a chave foi persistida em disco.
    expect(decryptSecret(encrypted1, tmpDir)).toBe('valor-1');

    const keyFile = path.join(tmpDir, '.secrets.key');
    expect(fs.existsSync(keyFile)).toBe(true);
  });

  it('usa uma chave diferente por configDir (arquivos de chave isolados)', () => {
    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-crypto-test-other-'));
    try {
      const encrypted = encryptSecret('segredo-do-dir-1', tmpDir);
      // Descriptografar com a chave de outro diretório deve falhar (chave errada) e retornar vazio.
      expect(decryptSecret(encrypted, otherDir)).toBe('');
    } finally {
      fs.rmSync(otherDir, { recursive: true, force: true });
    }
  });

  it('cada chamada gera um IV diferente, então o mesmo valor produz saídas criptografadas diferentes', () => {
    const a = encryptSecret('mesmo-valor', tmpDir);
    const b = encryptSecret('mesmo-valor', tmpDir);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, tmpDir)).toBe('mesmo-valor');
    expect(decryptSecret(b, tmpDir)).toBe('mesmo-valor');
  });

  it('retorna vazio (não lança) quando o valor está corrompido/adulterado', () => {
    const encrypted = encryptSecret('segredo', tmpDir)!;
    const tampered = encrypted.slice(0, -4) + 'AAAA';
    expect(decryptSecret(tampered, tmpDir)).toBe('');
  });
});
