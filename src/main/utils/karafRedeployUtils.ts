/**
 * Reinstalação de uma versão que o Karaf já tem. Com versão fixa (sem -SNAPSHOT), o `feature:install` compara só a
 * feature e o endereço `mvn:` de cada bundle: iguais, ele responde "already installed" / "No deployment change" e segue
 * com o jar antigo, mesmo depois de um `mvn clean install`. O `bundle:update <id>` relê o jar do endereço (o `.m2`).
 */

/** O `feature:install` terminou sem trocar nada no contêiner. */
export function isNoDeploymentChange(output: string): boolean {
  return /No deployment change|is already installed/i.test(output);
}

export interface BundleLocation {
  id: string;
  location: string;
}

/** Linhas de `bundle:list -l -t 0` (colunas por | ou │, a localização é a última). */
export function parseBundleLocations(stdout: string): BundleLocation[] {
  const rows: BundleLocation[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.split(/[|│]/).map((part) => part.trim());
    if (parts.length >= 3 && /^\d+$/.test(parts[0]) && parts[parts.length - 1]) {
      rows.push({ id: parts[0], location: parts[parts.length - 1] });
    }
  }
  return rows;
}

/** `mvn:grupo/artefato/versão[/tipo[/classificador]]` → partes; outra localização (file:, wrap:) → null. */
export function parseMvnLocation(location: string): { groupId: string; artifactId: string; version: string } | null {
  const match = /^mvn:([^/\s]+)\/([^/\s]+)\/([^/\s]+)/.exec(location.trim());
  return match ? { groupId: match[1], artifactId: match[2], version: match[3] } : null;
}

/**
 * Bundles do projeto: mesma versão do pom e grupo igual ao do projeto ou abaixo dele (módulos `grupo.dominio`).
 * Dependências de terceiros e de outros produtos ficam de fora.
 */
export function pickProjectBundles(rows: BundleLocation[], project: { groupId: string; version: string }): BundleLocation[] {
  const group = project.groupId.trim();
  if (!group || !project.version.trim()) return [];
  return rows.filter((row) => {
    const coords = parseMvnLocation(row.location);
    return Boolean(coords && coords.version === project.version && (coords.groupId === group || coords.groupId.startsWith(`${group}.`)));
  });
}
