import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Paridade entre o preload (o que o renderer chama) e o main (o que está registrado). Um canal chamado no preload
 * sem `ipcMain.handle` só falha em runtime ("No handler registered"), e um handler sem chamador é código morto.
 */
const IPC_DIR = __dirname;
const MAIN_DIR = path.resolve(__dirname, '..');
const PRELOAD = path.resolve(__dirname, '../../preload/index.ts');

function read(file: string): string {
  return fs.readFileSync(file, 'utf-8');
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, out);
    else if (full.endsWith('.ts') && !full.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

function matchAll(source: string, pattern: RegExp): string[] {
  return Array.from(source.matchAll(pattern), (m) => m[1]);
}

const handlerSources = listFiles(path.join(IPC_DIR, 'handlers')).map(read).join('\n');
const registered = matchAll(handlerSources, /ipcMain\.handle\(\s*'([^']+)'/g);
const invoked = matchAll(read(PRELOAD), /ipcRenderer\.invoke\(\s*'([^']+)'/g);
const listened = matchAll(read(PRELOAD), /ipcRenderer\.on\(\s*'([^']+)'/g);
const mainSources = listFiles(MAIN_DIR).map(read).join('\n');
const sent = new Set(matchAll(mainSources, /(?:(?:safeSend|notifyUser)\(\s*\w+\s*,|webContents\.send\()\s*'([^']+)'/g));

describe('canais IPC', () => {
  it('encontra os handlers e as chamadas do preload (guarda contra o regex deixar de casar)', () => {
    expect(registered.length).toBeGreaterThan(200);
    expect(invoked.length).toBeGreaterThan(200);
  });

  it('não registra o mesmo canal duas vezes (o segundo ipcMain.handle lança no boot)', () => {
    const duplicated = registered.filter((channel, i) => registered.indexOf(channel) !== i);
    expect(duplicated).toEqual([]);
  });

  it('todo canal chamado pelo preload tem handler no main', () => {
    const missing = [...new Set(invoked)].filter((channel) => !registered.includes(channel));
    expect(missing).toEqual([]);
  });

  it('todo handler do main é chamado pelo preload (sem canal morto)', () => {
    const unused = registered.filter((channel) => !invoked.includes(channel));
    expect(unused).toEqual([]);
  });

  it('todo evento que o preload escuta é emitido em algum ponto do main', () => {
    const silent = [...new Set(listened)].filter((channel) => !sent.has(channel));
    expect(silent).toEqual([]);
  });
});
