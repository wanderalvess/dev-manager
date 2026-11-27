import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadInstaller, md5FromGoogHash, probeInstaller } from './wshInstallerDownload';

const body = Buffer.from('conteudo falso do instalador');
const md5Hex = crypto.createHash('md5').update(body).digest('hex');
const googHash = (hex: string) => `crc32c=AAAAAA==, md5=${Buffer.from(hex, 'hex').toString('base64')}`;

const reply = (status: number, headers: Record<string, string> = {}, content: Buffer | null = null) =>
  (async () => new Response(content ? new Uint8Array(content) : null, { status, headers })) as unknown as typeof fetch;

describe('wshInstallerDownload', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsh-dl-test-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('lê o MD5 do cabeçalho x-goog-hash', () => {
    expect(md5FromGoogHash(googHash(md5Hex))).toBe(md5Hex);
    expect(md5FromGoogHash('crc32c=AAAAAA==')).toBeUndefined();
    expect(md5FromGoogHash(null)).toBeUndefined();
  });

  it('consulta só os cabeçalhos e traduz 404', async () => {
    const ok = await probeInstaller('1.39.22.31', reply(200, { 'content-length': '100734968', 'last-modified': 'Thu, 26 Nov 2026 20:27:29 GMT' }));
    expect(ok).toMatchObject({ success: true, sizeBytes: 100734968 });
    const missing = await probeInstaller('9.9.9.9', reply(404));
    expect(missing.success).toBe(false);
    expect(missing.error).toMatch(/não publicou/);
    const down = await probeInstaller('1.39.22.31', (async () => { throw new Error('ENOTFOUND'); }) as unknown as typeof fetch);
    expect(down.error).toMatch(/ENOTFOUND/);
  });

  it('baixa, confere tamanho e MD5 e só então renomeia', async () => {
    const target = path.join(dir, 'installer.exe');
    const seen: Array<number | undefined> = [];
    const r = await downloadInstaller('1.39.22.31', target, (p) => seen.push(p), reply(200, { 'content-length': String(body.length), 'x-goog-hash': googHash(md5Hex) }, body));
    expect(r).toEqual({ sizeBytes: body.length, md5: md5Hex });
    expect(fs.readFileSync(target).equals(body)).toBe(true);
    expect(fs.existsSync(`${target}.part`)).toBe(false);
    expect(seen.at(-1)).toBe(100);
  });

  it('recusa MD5 diferente e não deixa arquivo parcial', async () => {
    const target = path.join(dir, 'installer.exe');
    const wrong = crypto.createHash('md5').update('outro').digest('hex');
    await expect(
      downloadInstaller('1.39.22.31', target, vi.fn(), reply(200, { 'content-length': String(body.length), 'x-goog-hash': googHash(wrong) }, body))
    ).rejects.toThrow(/MD5/);
    expect(fs.existsSync(target)).toBe(false);
    expect(fs.existsSync(`${target}.part`)).toBe(false);
  });

  it('recusa resposta de erro do servidor', async () => {
    await expect(downloadInstaller('1.39.22.31', path.join(dir, 'x.exe'), vi.fn(), reply(500))).rejects.toThrow(/HTTP 500/);
  });
});
