/**
 * Publica no GitHub Releases o que saiu do `npm run build:electron`, para o "Verificar
 * atualização" do app (Ajuda › Sobre) encontrar a versão nova:
 *   - HubManager-Setup-X.exe + .blockmap + latest.yml → auto-update do instalado (electron-updater)
 *   - HubManager-Portable-X.exe → versão portátil (o app abre o download no navegador)
 *
 * Uso: npm run release:publish   (requer `gh` autenticado; tag = v<version do package.json>)
 * A release é criada se não existir; arquivos já enviados são substituídos (--clobber).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(repoRoot, 'release');
const version = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')).version;
const tag = `v${version}`;

const files = [
  `HubManager-Setup-${version}.exe`,
  `HubManager-Setup-${version}.exe.blockmap`,
  'latest.yml',
  `HubManager-Portable-${version}.exe`
].map((f) => path.join(releaseDir, f));

const missing = files.filter((f) => !fs.existsSync(f));
if (missing.length) {
  console.error(`[Publish] Arquivos ausentes em release/ (rode npm run build:electron):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
const latestYml = fs.readFileSync(path.join(releaseDir, 'latest.yml'), 'utf-8');
if (!latestYml.includes(`version: ${version}`)) {
  console.error(`[Publish] latest.yml não é da versão ${version}; refaça o build.`);
  process.exit(1);
}

const gh = (args, opts = {}) => execFileSync('gh', args, { cwd: repoRoot, stdio: 'inherit', ...opts });

let exists = true;
try {
  execFileSync('gh', ['release', 'view', tag], { cwd: repoRoot, stdio: 'ignore' });
} catch {
  exists = false;
}

if (!exists) {
  const notes = path.join(releaseDir, 'RELEASE_NOTES.md');
  const notesArgs = fs.existsSync(notes) ? ['--notes-file', notes] : ['--generate-notes'];
  gh(['release', 'create', tag, '--title', tag, '--latest', ...notesArgs]);
}
gh(['release', 'upload', tag, ...files, '--clobber']);
console.log(`[Publish] ${tag} publicada — apps instalados vão oferecer a atualização na próxima checagem.`);
