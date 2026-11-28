import { execFile } from 'child_process';
import { createRequire } from 'module';
import path from 'path';

/**
 * Roteiro do processo filho: roda o 7-Zip compilado para WASM (pacote `7z-wasm`) sobre um arquivo do disco.
 * Fica fora do processo principal porque a extração é síncrona e leva alguns segundos (o instalador tem ~100 MB).
 * Argumentos: caminho do módulo, pasta do arquivo, nome do arquivo, pasta de saída e os padrões a extrair.
 */
const CHILD_SCRIPT = `
const [modPath, inDir, inFile, outDir, ...patterns] = process.argv.slice(1);
const errors = [];
(async () => {
  const mod = require(modPath);
  const SevenZip = mod.default || mod;
  const z = await SevenZip({ print() {}, printErr: (s) => errors.push(String(s)) });
  z.FS.mkdir('/in');
  z.FS.mkdir('/out');
  z.FS.mount(z.NODEFS, { root: inDir }, '/in');
  z.FS.mount(z.NODEFS, { root: outDir }, '/out');
  try {
    z.callMain(['e', '/in/' + inFile, '-o/out', '-y', ...patterns]);
  } catch (e) {
    if (!(e && e.status === 0)) throw e;
  }
})().then(
  () => process.exit(0),
  (e) => { console.error(errors.join(' ') || String((e && e.message) || e)); process.exit(1); }
);
`;

function resolveSevenZipModule(): string {
  return createRequire(import.meta.url).resolve('7z-wasm');
}

/**
 * Extrai de um arquivo 7z (ou de um .exe auto-extrator 7z) os itens que casam com os padrões, sem manter a
 * estrutura de pastas, para `outDir`. Rejeita se o 7-Zip falhar.
 */
export function extractFromArchive(archive: string, outDir: string, patterns: string[], timeoutMs = 180000): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['-e', CHILD_SCRIPT, resolveSevenZipModule(), path.dirname(archive), path.basename(archive), outDir, ...patterns];
    execFile(process.execPath, args, { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, _stdout, stderr) => {
      if (err) reject(new Error(String(stderr || '').trim().slice(0, 400) || `A extração falhou (${(err as NodeJS.ErrnoException).code ?? 'erro'}).`));
      else resolve();
    });
  });
}
