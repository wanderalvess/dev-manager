/**
 * Gera o servidor MCP autossuficiente para distribuir junto do release, sem exigir o
 * repositório nem `npx tsx` na máquina do usuário.
 *
 * Saída (padrão: release/mcp):
 *   dev-manager-mcp.mjs   bundle único de src/mcp/index.ts (dependências JS inlineadas)
 *   dev-manager-mcp.cmd   launcher: usa o Hub Manager.exe instalado como runtime Node
 *   node_modules/         só os módulos nativos que não podem ir para o bundle
 *
 * Uso: node scripts/build-mcp.cjs [pastaDeSaida]
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const rootNodeModules = path.join(repoRoot, 'node_modules');

// Mesmo critério do `external` do vite.config.ts: binários nativos (.node) e drivers com
// require() dinâmico de binário por plataforma quebram quando inlineados pelo bundler.
const NATIVE_EXTERNALS = ['oracledb', 'fastembed', 'onnxruntime-node'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

/** Resolve a pasta de um pacote pelo algoritmo do Node (sobe procurando node_modules). */
function resolvePackageDir(name, fromDir) {
  let dir = fromDir;
  while (dir.startsWith(repoRoot)) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Fecho transitivo de dependencies/optionalDependencies instaladas a partir dos externals. */
function collectRuntimePackages(names) {
  const found = new Set();
  const visit = (name, fromDir, optional) => {
    const pkgDir = resolvePackageDir(name, fromDir);
    if (!pkgDir) {
      // Opcional de outra plataforma (ex.: tokenizers-linux-*) simplesmente não está instalado.
      if (optional) return;
      throw new Error(`[MCP] Dependência "${name}" não encontrada em node_modules (rode npm install).`);
    }
    if (found.has(pkgDir)) return;
    found.add(pkgDir);
    const pkg = readJson(path.join(pkgDir, 'package.json'));
    for (const dep of Object.keys(pkg.dependencies || {})) visit(dep, pkgDir, false);
    for (const dep of Object.keys(pkg.optionalDependencies || {})) visit(dep, pkgDir, true);
  };
  for (const name of names) visit(name, repoRoot, false);
  return [...found];
}

/** Remove binários de outras plataformas: o release é só Windows x64. */
function pruneForeignBinaries(outNodeModules) {
  const onnxBin = path.join(outNodeModules, 'onnxruntime-node', 'bin', 'napi-v3');
  for (const platform of ['darwin', 'linux']) {
    fs.rmSync(path.join(onnxBin, platform), { recursive: true, force: true });
  }
  fs.rmSync(path.join(onnxBin, 'win32', 'arm64'), { recursive: true, force: true });

  const oracleRelease = path.join(outNodeModules, 'oracledb', 'build', 'Release');
  if (fs.existsSync(oracleRelease)) {
    for (const file of fs.readdirSync(oracleRelease)) {
      if (file.endsWith('.node') && !file.includes('win32-x64')) {
        fs.rmSync(path.join(oracleRelease, file), { force: true });
      }
    }
  }
}

function writeCrlf(file, content) {
  fs.writeFileSync(file, content.replace(/\r?\n/g, '\r\n'), 'utf-8');
}

async function buildMcp(outDir = path.join(repoRoot, 'release', 'mcp')) {
  let esbuild;
  try {
    esbuild = require('esbuild');
  } catch {
    try {
      esbuild = require(require.resolve('esbuild', { paths: [repoRoot] }));
    } catch (err) {
      throw new Error(
        `[MCP] O módulo 'esbuild' não foi encontrado. Certifique-se de que ele esteja instalado em 'dependencies' no package.json ou execute 'npm install'. Detalhes: ${err.message}`
      );
    }
  }
  const version = readJson(path.join(repoRoot, 'package.json')).version;

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[MCP] Gerando bundle do servidor MCP v${version}...`);
  await esbuild.build({
    entryPoints: [path.join(repoRoot, 'src', 'mcp', 'index.ts')],
    outfile: path.join(outDir, 'dev-manager-mcp.mjs'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    external: [...NATIVE_EXTERNALS, 'pg-native', '*.node'],
    define: { __DEV_MANAGER_VERSION__: JSON.stringify(version) },
    // Dependências CJS inlineadas num bundle ESM chamam require() de builtins; sem isso o
    // esbuild lança "Dynamic require of 'fs' is not supported" em runtime.
    banner: {
      js: "import { createRequire as __devManagerCreateRequire } from 'module';\nconst require = __devManagerCreateRequire(import.meta.url);"
    },
    legalComments: 'none',
    logLevel: 'warning'
  });

  console.log('[MCP] Copiando módulos nativos (oracledb, fastembed/onnxruntime)...');
  const outNodeModules = path.join(outDir, 'node_modules');
  for (const pkgDir of collectRuntimePackages(NATIVE_EXTERNALS)) {
    const relative = path.relative(rootNodeModules, pkgDir);
    fs.cpSync(pkgDir, path.join(outNodeModules, relative), { recursive: true, dereference: true });
  }
  pruneForeignBinaries(outNodeModules);

  const launcherTemplate = fs.readFileSync(path.join(__dirname, 'release-templates', 'dev-manager-mcp.cmd'), 'utf-8');
  writeCrlf(path.join(outDir, 'dev-manager-mcp.cmd'), launcherTemplate);

  console.log(`[MCP] Servidor MCP gerado em ${outDir}`);
  return outDir;
}

module.exports = { buildMcp };

if (require.main === module) {
  buildMcp(process.argv[2] ? path.resolve(process.argv[2]) : undefined).catch((err) => {
    console.error('[MCP] Falha ao gerar o servidor MCP:', err);
    process.exit(1);
  });
}
