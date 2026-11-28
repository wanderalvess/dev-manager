import fs from 'fs';
import path from 'path';
import { extractFromArchive } from './sevenZipExtract';
import { rebuildJarFromPack, type RebuiltJar } from './wshInstallerPack';

/**
 * Abre o instalador oficial do WSH (auto-extrator 7z com um instalador IzPack dentro) e devolve o
 * `winthor-integracao-core.jar` dele com o diretório central refeito. Nada do instalador é executado.
 * `workDir` guarda temporários e fica limpo no fim.
 */
export async function jarFromInstaller(installer: string, workDir: string): Promise<RebuiltJar> {
  const packDir = path.join(workDir, 'packs');
  fs.rmSync(packDir, { recursive: true, force: true });
  fs.mkdirSync(packDir, { recursive: true });
  let izpack: string | undefined;
  try {
    await extractFromArchive(installer, workDir, ['WSH-setup-*.jar']);
    izpack = fs.readdirSync(workDir).find((f) => /^WSH-setup-.*\.jar$/.test(f));
    if (!izpack) throw new Error('O arquivo não parece o instalador do WSH (falta o pacote WSH-setup-*.jar).');
    await extractFromArchive(path.join(workDir, izpack), packDir, ['resources/packs/pack-*']);
    // O pack do WSH é o maior; os outros guardam só arquivos de configuração
    const packs = fs.readdirSync(packDir).map((f) => ({ f, size: fs.statSync(path.join(packDir, f)).size })).sort((a, b) => b.size - a.size);
    if (!packs.length) throw new Error('O instalador não traz o pacote do WSH.');
    return rebuildJarFromPack(fs.readFileSync(path.join(packDir, packs[0].f)));
  } finally {
    if (izpack) fs.rmSync(path.join(workDir, izpack), { force: true });
    fs.rmSync(packDir, { recursive: true, force: true });
  }
}
