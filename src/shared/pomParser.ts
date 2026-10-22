export interface PomCoordinate {
  groupId: string;
  artifactId: string;
}

export interface ParsedPom {
  groupId: string;
  artifactId: string;
  version: string;
  packaging: string;
  parent?: PomCoordinate;
  dependencies: PomCoordinate[];
  modules: string[];
}

function tag(xml: string, name: string): string {
  return xml.match(new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`))?.[1] ?? '';
}

/** Remove blocos que não declaram dependências do projeto: comentários, gerenciamento, plugins e perfis. */
function stripNoise(xml: string): string {
  return xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<dependencyManagement>[\s\S]*?<\/dependencyManagement>/g, '')
    .replace(/<build>[\s\S]*?<\/build>/g, '')
    .replace(/<profiles>[\s\S]*?<\/profiles>/g, '');
}

/**
 * Lê as coordenadas e dependências de um pom.xml com regex, sem resolver propriedades nem herança.
 * Basta para ordenar um conjunto de projetos do workspace; groupId/versão herdados do parent entram como fallback.
 */
export function parsePom(xml: string): ParsedPom | null {
  if (typeof xml !== 'string' || !xml.includes('<project')) return null;
  const clean = stripNoise(xml);

  const parentBlock = clean.match(/<parent>([\s\S]*?)<\/parent>/)?.[1];
  const parent = parentBlock
    ? { groupId: tag(parentBlock, 'groupId'), artifactId: tag(parentBlock, 'artifactId') }
    : undefined;
  const parentVersion = parentBlock ? tag(parentBlock, 'version') : '';

  const depsBlock = clean.match(/<dependencies>([\s\S]*?)<\/dependencies>/)?.[1] ?? '';
  const dependencies = [...depsBlock.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)]
    .map((m) => ({ groupId: tag(m[1], 'groupId'), artifactId: tag(m[1], 'artifactId') }))
    .filter((d) => d.artifactId);

  // Coordenadas próprias: o que sobra fora de <parent>, <dependencies> e <modules>.
  const own = clean
    .replace(/<parent>[\s\S]*?<\/parent>/, '')
    .replace(/<dependencies>[\s\S]*?<\/dependencies>/, '')
    .replace(/<modules>[\s\S]*?<\/modules>/, '');
  const artifactId = tag(own, 'artifactId');
  if (!artifactId) return null;

  const modules = [...(clean.match(/<modules>([\s\S]*?)<\/modules>/)?.[1] ?? '').matchAll(/<module>\s*([^<]+?)\s*<\/module>/g)].map(
    (m) => m[1]
  );

  return {
    groupId: tag(own, 'groupId') || parent?.groupId || '',
    artifactId,
    version: tag(own, 'version') || parentVersion,
    packaging: tag(own, 'packaging') || 'jar',
    parent: parent?.artifactId ? parent : undefined,
    dependencies,
    modules
  };
}
