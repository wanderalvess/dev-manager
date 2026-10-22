/** pom.xml alterado só para testar localmente (ex.: apontar para um SNAPSHOT instalado): não pode ir para o commit. */
export interface AlteredPom {
  id: string;
  /** Caminho do pom.xml alterado. */
  pomPath: string;
  /** Pasta do projeto/módulo (a que o PomService recebe). */
  projectPath: string;
  groupId?: string;
  artifactId: string;
  from: string;
  to: string;
  /** Valor substituído; sem ele não dá para reverter pelo app (ex.: versão que antes vinha do pom pai). */
  previousValue?: string;
  viaProperty?: string;
  backupPath?: string;
  at: number;
}

export const MAX_ALTERED_POMS = 20;

export function sanitizeAlteredPoms(raw: unknown): AlteredPom[] {
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => ({
      id: str(e.id),
      pomPath: str(e.pomPath),
      projectPath: str(e.projectPath),
      groupId: str(e.groupId) || undefined,
      artifactId: str(e.artifactId),
      from: str(e.from),
      to: str(e.to),
      previousValue: str(e.previousValue) || undefined,
      viaProperty: str(e.viaProperty) || undefined,
      backupPath: str(e.backupPath) || undefined,
      at: typeof e.at === 'number' ? e.at : 0
    }))
    .filter((e) => e.id && e.pomPath && e.artifactId)
    .slice(0, MAX_ALTERED_POMS);
}

const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

/** Caminho do pom relativo à raiz do repositório (como o `git status` lista), ou null se o pom é de outro repositório. */
export function relativeToRepo(pomPath: string, repoPath: string): string | null {
  const pom = norm(pomPath);
  const repo = norm(repoPath);
  return repo && pom.startsWith(`${repo}/`) ? pom.slice(repo.length + 1) : null;
}

/** Poms alterados que aparecem na lista de arquivos do commit (o pom.xml ou o pom.xml.bak ao lado dele). */
export function alteredPomsInCommit(entries: AlteredPom[], repoPath: string, commitFiles: string[]): AlteredPom[] {
  const files = new Set(commitFiles.map(norm));
  return entries.filter((e) => {
    const rel = relativeToRepo(e.pomPath, repoPath);
    return rel !== null && (files.has(rel) || files.has(`${rel}.bak`));
  });
}
