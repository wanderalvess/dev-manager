/**
 * Smoke test do build empacotado: roda `electron-builder --dir` (via build-electron.cjs)
 * e valida o conteudo do app.asar sem precisar instalar nada.
 *
 * Confere:
 * - app.asar contem dist/, dist-electron/ e package.json
 * - os binarios nativos do fastembed (onnxruntime-node, @anush008/tokenizers-*) ficaram
 *   FORA do asar (asarUnpack), em resources/app.asar.unpacked, como o electron-builder.json5 exige
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RELEASE_DIR = path.join(ROOT, 'release');

function fail(msg) {
  console.error(`[SmokeTest] FALHA: ${msg}`);
  process.exit(1);
}

function run(cmd, args) {
  console.log(`[SmokeTest] Executando: ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    fail(`comando "${cmd} ${args.join(' ')}" saiu com codigo ${result.status}`);
  }
}

function findUnpackedDir() {
  if (!fs.existsSync(RELEASE_DIR)) return null;
  const candidates = fs.readdirSync(RELEASE_DIR).filter((name) => name.endsWith('-unpacked'));
  if (candidates.length === 0) return null;
  return path.join(RELEASE_DIR, candidates[0]);
}

function main() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  run(npmCmd, ['run', 'pack']);

  const unpackedDir = findUnpackedDir();
  if (!unpackedDir) {
    fail(`nenhum diretorio "*-unpacked" encontrado em ${RELEASE_DIR}`);
  }
  console.log(`[SmokeTest] Diretorio unpacked: ${unpackedDir}`);

  const asarPath = path.join(unpackedDir, 'resources', 'app.asar');
  if (!fs.existsSync(asarPath)) {
    fail(`app.asar nao encontrado em ${asarPath}`);
  }

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const listResult = spawnSync(npxCmd, ['asar', 'list', asarPath], {
    cwd: ROOT,
    encoding: 'utf-8',
    shell: true
  });
  if (listResult.status !== 0) {
    fail(`"npx asar list" falhou: ${listResult.stderr || listResult.stdout}`);
  }
  // `npx asar list` usa separador nativo do SO (backslash no Windows) — normaliza pra "/" antes de comparar.
  const asarEntries = listResult.stdout.split(/\r?\n/).map((line) => line.replace(/\\/g, '/'));

  const requiredInAsar = ['/dist', '/dist-electron', '/package.json'];
  for (const entry of requiredInAsar) {
    const found = asarEntries.some((line) => line === entry || line.startsWith(`${entry}/`));
    if (!found) {
      fail(`"${entry}" nao encontrado dentro de app.asar (build incompleto?)`);
    }
    console.log(`[SmokeTest] OK dentro do asar: ${entry}`);
  }

  const unpackedNodeModules = path.join(unpackedDir, 'resources', 'app.asar.unpacked', 'node_modules');
  const requiredUnpacked = [
    { label: 'onnxruntime-node', check: () => fs.existsSync(path.join(unpackedNodeModules, 'onnxruntime-node')) },
    {
      label: '@anush008/tokenizers-*',
      check: () => {
        const scopeDir = path.join(unpackedNodeModules, '@anush008');
        if (!fs.existsSync(scopeDir)) return false;
        return fs.readdirSync(scopeDir).some((name) => name.startsWith('tokenizers'));
      }
    }
  ];
  for (const dep of requiredUnpacked) {
    if (!dep.check()) {
      fail(
        `"${dep.label}" nao encontrado em resources/app.asar.unpacked/node_modules ` +
          `(esperado pelo asarUnpack do electron-builder.json5)`
      );
    }
    console.log(`[SmokeTest] OK fora do asar (unpacked): ${dep.label}`);
  }

  console.log('[SmokeTest] Sucesso: build empacotado passou em todas as verificacoes.');
}

main();
