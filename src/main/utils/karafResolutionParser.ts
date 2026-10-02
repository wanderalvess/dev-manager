/**
 * Utilitário de parsing e diagnóstico inteligente de falhas de resolução OSGi no Apache Karaf / Felix.
 *
 * Quando um comando como 'feature:install' ou 'bundle:install' falha com ResolutionException / Unable to resolve,
 * este módulo extrai a cadeia de causa raiz, identifica o pacote ou bundle ausente com suas restrições de versão,
 * cruza com as dependências do pom.xml do projeto e sugere perfis ou comandos exatos de resolução.
 */

export interface OsgiResolutionCause {
  /** Identificador do bundle ou feature que falhou (ex: 'winthor-integracao-varejo-service/0.0.1.SNAPSHOT') */
  bundleOrFeature: string;
  /** Nome limpo do bundle (sem versão) */
  bundleName: string;
  /** Versão do bundle, se identificada */
  bundleVersion?: string;
  /** Tipo de capacidade/requisito requerido (ex: 'osgi.wiring.package', 'osgi.identity', 'osgi.service') */
  requirementType: 'package' | 'bundle' | 'service' | 'identity' | 'generic';
  /** O item exato que faltou (ex: nome do pacote Java ou symbolicName do bundle) */
  missingItem: string;
  /** Filtro LDAP original do OSGi (ex: '(&(osgi.wiring.package=...)(version>=1.39.0)...)') */
  filter?: string;
  /** Versão mínima exigida pelo filtro, se presente */
  versionMin?: string;
  /** Versão máxima exigida pelo filtro, se presente */
  versionMax?: string;
  /** Descrição legível da faixa de versões exigida (ex: '>= 1.39.0 e < 2.0.0 [faixa 1.39.0, 2.0.0)') */
  versionRangeDesc?: string;
}

export interface PomDependency {
  groupId: string;
  artifactId: string;
  version: string;
}

export interface OsgiResolutionDiagnostic {
  /** Indica se foi detectado erro de resolução OSGi */
  isResolutionError: boolean;
  /** Feature ou módulo raiz da falha (ex: 'winthor-integracao-varejo') */
  rootTarget?: string;
  /** Causa raiz detalhada mais profunda na cadeia 'caused by' */
  rootCause: OsgiResolutionCause;
  /** Cadeia completa de causas (da raiz até a causa fundamental) */
  causesChain: OsgiResolutionCause[];
  /** Dependência do pom.xml correlacionada com o pacote/item faltante */
  matchedPomDependency?: PomDependency;
  /** Perfil de deploy cadastrado sugerido para resolver a dependência */
  matchedProfileName?: string;
  matchedProfileId?: string;
  /** Projeto local Git encontrado na máquina */
  matchedProjectPath?: string;
  matchedProjectName?: string;
  /** Comandos Karaf sugeridos para instalar ou diagnosticar */
  suggestedKarafCommands: {
    repoAddCommand?: string;
    installCommand?: string;
    diagnosticCommand?: string;
  };
  /** Alerta de conflito entre versões (ex: exigindo release 1.39.x enquanto projeto local é 0.0.1-SNAPSHOT) */
  versionMismatchWarning?: string;
  /** Banner formatado pronto para exibição no console/terminal com cores e ícones */
  formattedBanner: string;
}

/**
 * Remove códigos de controle ANSI da string para permitir regex confiável sobre texto limpo.
 */
export function stripAnsi(text: string): string {
  if (!text) return '';
  // Remove escapes padrão ESC[...m e ESC[...K
  return text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\[[0-9;]+m/g, '');
}

/**
 * Analisa um filtro LDAP OSGi e extrai versões mínima e máxima exigidas.
 */
export function parseVersionFilter(filterText: string): {
  versionMin?: string;
  versionMax?: string;
  versionRangeDesc?: string;
} {
  if (!filterText) return {};

  const minMatch = filterText.match(/\(version>=([^)]+)\)/);
  // Padrões para versão máxima: (!(version>=X)) ou (version<X) ou (version<=X)
  const maxNotGteMatch = filterText.match(/\(!\(version>=([^)]+)\)\)/);
  const maxLtMatch = filterText.match(/\(version<([^)]+)\)/);
  const maxLteMatch = filterText.match(/\(version<=([^)]+)\)/);

  const versionMin = minMatch ? minMatch[1].trim() : undefined;
  const versionMax = maxNotGteMatch
    ? maxNotGteMatch[1].trim()
    : maxLtMatch
    ? maxLtMatch[1].trim()
    : maxLteMatch
    ? maxLteMatch[1].trim()
    : undefined;

  let versionRangeDesc: string | undefined;
  if (versionMin && versionMax) {
    versionRangeDesc = `>= ${versionMin} e < ${versionMax} (faixa [${versionMin}, ${versionMax}))`;
  } else if (versionMin) {
    versionRangeDesc = `>= ${versionMin}`;
  } else if (versionMax) {
    versionRangeDesc = `< ${versionMax}`;
  }

  return { versionMin, versionMax, versionRangeDesc };
}

/**
 * Converte uma seção individual da cadeia OSGi em uma causa estruturada.
 */
function parseSingleCauseBlock(block: string): OsgiResolutionCause | null {
  const trimmed = block.trim();
  if (!trimmed) return null;

  // Extrai "Unable to resolve <bundle/version>"
  const unableMatch = trimmed.match(/Unable to resolve\s+([^:]+):/i);
  const bundleOrFeature = unableMatch ? unableMatch[1].trim() : 'Desconhecido';
  const bundleParts = bundleOrFeature.split('/');
  const bundleName = bundleParts[0] || bundleOrFeature;
  const bundleVersion = bundleParts[1];

  // Extrai "missing requirement [...] <type>"
  const reqMatch = trimmed.match(/missing requirement\s*(?:\[[^\]]*\])?\s*([a-zA-Z0-9_.-]+)/i);
  const rawReqType = reqMatch ? reqMatch[1].trim().toLowerCase() : '';

  let requirementType: OsgiResolutionCause['requirementType'] = 'generic';
  if (rawReqType.includes('package')) requirementType = 'package';
  else if (rawReqType.includes('bundle')) requirementType = 'bundle';
  else if (rawReqType.includes('service')) requirementType = 'service';
  else if (rawReqType.includes('identity')) requirementType = 'identity';

  // Extrai filter:="..."
  const filterMatch = trimmed.match(/filter:="([^"]+)"/);
  const filter = filterMatch ? filterMatch[1] : undefined;

  let missingItem = '';
  if (filter) {
    if (requirementType === 'package') {
      const pkgMatch = filter.match(/\(osgi\.wiring\.package=([^)]+)\)/);
      if (pkgMatch) missingItem = pkgMatch[1].trim();
    } else if (requirementType === 'bundle') {
      const bndMatch = filter.match(/\(osgi\.wiring\.bundle=([^)]+)\)/);
      if (bndMatch) missingItem = bndMatch[1].trim();
    } else if (requirementType === 'service') {
      const srvMatch = filter.match(/\(objectClass=([^)]+)\)/);
      if (srvMatch) missingItem = srvMatch[1].trim();
    } else if (requirementType === 'identity') {
      const idMatch = filter.match(/\(osgi\.identity=([^)]+)\)/);
      if (idMatch) missingItem = idMatch[1].trim();
    }
  }

  // Fallbacks caso o filter não tenha trazido o item direto
  if (!missingItem) {
    const identFallback = trimmed.match(/osgi\.identity=([^;"]+)/);
    if (identFallback) {
      missingItem = identFallback[1].trim();
      if (requirementType === 'generic') requirementType = 'identity';
    }
  }

  const { versionMin, versionMax, versionRangeDesc } = filter ? parseVersionFilter(filter) : {};

  return {
    bundleOrFeature,
    bundleName,
    bundleVersion,
    requirementType,
    missingItem: missingItem || bundleName,
    filter,
    versionMin,
    versionMax,
    versionRangeDesc
  };
}

/**
 * Analisa a saída bruta de um comando Karaf e extrai a cadeia de resolução OSGi.
 */
export function parseOsgiResolutionError(rawOutput: string): {
  rootTarget?: string;
  rootCause: OsgiResolutionCause;
  causesChain: OsgiResolutionCause[];
} | null {
  const clean = stripAnsi(rawOutput);
  if (!clean) return null;

  const isResException = /ResolutionException|Unable to resolve root|missing requirement/i.test(clean);
  if (!isResException) return null;

  // Divide a mensagem pela sequência "caused by:" ou "[caused by:"
  const parts = clean.split(/\[?caused by:\s*/i);
  if (parts.length === 0) return null;

  const causesChain: OsgiResolutionCause[] = [];
  for (const part of parts) {
    const cause = parseSingleCauseBlock(part);
    if (cause) {
      causesChain.push(cause);
    }
  }

  if (causesChain.length === 0) return null;

  // A raiz é a primeira; a causa fundamental (deepest) é a última da cadeia
  const rootCause = causesChain[causesChain.length - 1];
  const rootTarget = causesChain[0]?.bundleOrFeature;

  return {
    rootTarget,
    rootCause,
    causesChain
  };
}

/**
 * Lê o conteúdo XML de um pom.xml e extrai todas as tags <dependency> declaradas.
 */
export function extractPomDependencies(pomXmlContent: string): PomDependency[] {
  if (!pomXmlContent) return [];
  // Remove comentários XML para evitar falsos positivos
  const cleanXml = pomXmlContent.replace(/<!--[\s\S]*?-->/g, '');

  const dependencies: PomDependency[] = [];
  const depBlockRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
  let match: RegExpExecArray | null;

  while ((match = depBlockRegex.exec(cleanXml)) !== null) {
    const block = match[1];
    const groupIdMatch = block.match(/<groupId>([^<]+)<\/groupId>/);
    const artifactIdMatch = block.match(/<artifactId>([^<]+)<\/artifactId>/);
    const versionMatch = block.match(/<version>([^<]+)<\/version>/);

    if (groupIdMatch && artifactIdMatch) {
      dependencies.push({
        groupId: groupIdMatch[1].trim(),
        artifactId: artifactIdMatch[1].trim(),
        version: versionMatch ? versionMatch[1].trim() : ''
      });
    }
  }

  return dependencies;
}

/**
 * Cruza o pacote ou item ausente (ex: com.br.com.pcsist.winthor.varejo.matcon.domain...)
 * com as dependências do POM para descobrir qual artefato Maven é o fornecedor provável.
 */
export function correlateWithPomDependencies(
  missingItem: string,
  pomXmlContent: string
): PomDependency | null {
  if (!missingItem || !pomXmlContent) return null;
  const dependencies = extractPomDependencies(pomXmlContent);
  if (dependencies.length === 0) return null;

  const missingLower = missingItem.toLowerCase();

  let bestMatch: PomDependency | null = null;
  let bestScore = 0;

  for (const dep of dependencies) {
    let score = 0;
    const artLower = dep.artifactId.toLowerCase();
    const groupLower = dep.groupId.toLowerCase();

    // Se o artifactId direto estiver contido no pacote ausente
    if (missingLower.includes(artLower)) {
      score += 20;
    }

    // Compara tokens significativos do artifactId (ex: "winthor-integracao-matcon-service" -> "matcon")
    const artTokens = artLower.split(/[-_.]/).filter((t) => t.length >= 3 && !['winthor', 'integracao', 'service', 'api'].includes(t));
    for (const token of artTokens) {
      if (missingLower.includes(token)) {
        score += 15;
      }
    }

    // Compara tokens do groupId
    const groupTokens = groupLower.split(/[-_.]/).filter((t) => t.length >= 3 && !['com', 'br', 'pcsist', 'totvs', 'winthor'].includes(t));
    for (const token of groupTokens) {
      if (missingLower.includes(token)) {
        score += 5;
      }
    }

    // Se bater tanto token de negócio quanto grupo
    if (score > bestScore) {
      bestScore = score;
      bestMatch = dep;
    }
  }

  return bestScore >= 10 ? bestMatch : null;
}

/**
 * Formata um relatório completo em formato de texto para emissão no terminal / console.
 */
export function formatOsgiResolutionDiagnostic(diag: {
  rootCause: OsgiResolutionCause;
  rootTarget?: string;
  matchedPomDependency?: PomDependency;
  matchedProfileName?: string;
  matchedProjectName?: string;
  versionMismatchWarning?: string;
}): string {
  const { rootCause, rootTarget, matchedPomDependency, matchedProfileName, matchedProjectName, versionMismatchWarning } = diag;

  const lines: string[] = [];
  lines.push('');
  lines.push('======================================================================');
  lines.push('🔍 DIAGNÓSTICO INTELIGENTE DE DEPENDÊNCIA OSGi (ResolutionException)');
  lines.push('======================================================================');

  if (rootTarget && rootTarget !== rootCause.bundleOrFeature) {
    lines.push(`• Alvo Raiz: ${rootTarget}`);
  }
  lines.push(`• Módulo com falha: ${rootCause.bundleName}${rootCause.bundleVersion ? ` (${rootCause.bundleVersion})` : ''}`);

  const reqTypeLabel =
    rootCause.requirementType === 'package'
      ? 'Pacote Java (osgi.wiring.package)'
      : rootCause.requirementType === 'bundle'
      ? 'Bundle OSGi (osgi.wiring.bundle)'
      : rootCause.requirementType === 'service'
      ? 'Serviço OSGi (osgi.service)'
      : 'Capacidade OSGi';

  lines.push(`• Dependência ausente: ${reqTypeLabel}`);
  lines.push(`  👉 ${rootCause.missingItem}`);

  if (rootCause.versionRangeDesc) {
    lines.push(`• Versão requerida pelo OSGi: ${rootCause.versionRangeDesc}`);
  }

  if (matchedPomDependency) {
    lines.push(`• Dependência identificada no pom.xml:`);
    lines.push(`  📦 ${matchedPomDependency.groupId}:${matchedPomDependency.artifactId}:${matchedPomDependency.version || 'não especificada'}`);
  }

  if (versionMismatchWarning) {
    lines.push('');
    lines.push(`⚠️ [ALERTA DE VERSÃO] ${versionMismatchWarning}`);
  }

  lines.push('');
  lines.push('💡 RECURSOS & AÇÕES DISPONÍVEIS:');

  let actionIndex = 1;

  if (matchedProfileName) {
    lines.push(`  [${actionIndex++}] Perfil de Deploy cadastrado: "${matchedProfileName}"`);
    lines.push(`      -> Execute o deploy do perfil "${matchedProfileName}" para publicar este módulo no Karaf.`);
  }

  if (matchedPomDependency && matchedPomDependency.version && !matchedPomDependency.version.toUpperCase().includes('SNAPSHOT')) {
    const featureName = matchedPomDependency.artifactId.replace('-service', '');
    lines.push(`  [${actionIndex++}] Instalar Release Oficial (${matchedPomDependency.version}) diretamente do Nexus:`);
    lines.push(`      feature:repo-add mvn:${matchedPomDependency.groupId}/${matchedPomDependency.artifactId}/${matchedPomDependency.version}/xml/features`);
    lines.push(`      feature:install -r -u ${featureName}/${matchedPomDependency.version}`);
  } else if (matchedProjectName) {
    lines.push(`  [${actionIndex++}] Projeto local identificado no workspace: "${matchedProjectName}"`);
    lines.push(`      -> Compile e faça o deploy local do projeto "${matchedProjectName}" para atualizar o Karaf.`);
  }

  // Dica de diagnóstico CLI
  const keyword = matchedPomDependency
    ? matchedPomDependency.artifactId.replace(/^winthor-integracao-|-service$/g, '')
    : rootCause.missingItem.split('.').slice(-2, -1)[0] || rootCause.missingItem;

  lines.push(`  [${actionIndex++}] Para verificar bundles existentes no Karaf:`);
  lines.push(`      bundle:list -s | grep ${keyword}`);

  lines.push('======================================================================');
  lines.push('');

  return lines.join('\r\n');
}

/**
 * Função orquestradora completa: analisa a saída do Karaf, cruza com o pom.xml (se fornecido),
 * perfis de deploy e projetos cadastrados, e devolve o diagnóstico completo e estruturado.
 */
export function diagnoseKarafResolutionError(params: {
  rawOutput: string;
  pomXmlContent?: string;
  deployProfiles?: Array<{ id: string; name: string; steps?: Array<{ command?: string; name?: string }> }>;
  projects?: Array<{ name: string; path: string }>;
}): OsgiResolutionDiagnostic | null {
  const parsed = parseOsgiResolutionError(params.rawOutput);
  if (!parsed) return null;

  const { rootTarget, rootCause, causesChain } = parsed;

  let matchedPomDependency: PomDependency | undefined;
  if (params.pomXmlContent) {
    matchedPomDependency = correlateWithPomDependencies(rootCause.missingItem, params.pomXmlContent) || undefined;
  }

  // Palavra-chave para busca em perfis/projetos
  const searchKeyword = matchedPomDependency
    ? matchedPomDependency.artifactId.toLowerCase().replace(/winthor-integracao-|-service/g, '')
    : rootCause.missingItem.toLowerCase();

  // Localiza perfil correspondente
  let matchedProfileName: string | undefined;
  let matchedProfileId: string | undefined;
  if (params.deployProfiles && searchKeyword) {
    const foundProfile = params.deployProfiles.find((p) => {
      const pName = p.name.toLowerCase();
      if (pName.includes(searchKeyword) || (searchKeyword.length > 3 && searchKeyword.includes(pName))) return true;
      return (p.steps || []).some((s) => (s.command || '').toLowerCase().includes(searchKeyword));
    });
    if (foundProfile) {
      matchedProfileName = foundProfile.name;
      matchedProfileId = foundProfile.id;
    }
  }

  // Localiza projeto Git local no workspace
  let matchedProjectName: string | undefined;
  let matchedProjectPath: string | undefined;
  if (params.projects && searchKeyword) {
    const foundProj = params.projects.find((p) => p.name.toLowerCase().includes(searchKeyword));
    if (foundProj) {
      matchedProjectName = foundProj.name;
      matchedProjectPath = foundProj.path;
    }
  }

  // Alerta de descasamento de versão SNAPSHOT vs RELEASE
  let versionMismatchWarning: string | undefined;
  if (matchedPomDependency && matchedPomDependency.version) {
    const isPomRelease = !matchedPomDependency.version.toUpperCase().includes('SNAPSHOT');
    if (isPomRelease && rootCause.versionMin && rootCause.versionMax) {
      versionMismatchWarning =
        `O pom.xml exige uma versão de Release específica (${matchedPomDependency.version}, faixa ${rootCause.versionRangeDesc || ''}). ` +
        `Se você estiver desenvolvendo localmente em versão SNAPSHOT, altere a dependência no pom.xml ou instale a release correspondente do Nexus.`;
    }
  }

  // Comandos sugeridos
  const suggestedKarafCommands: OsgiResolutionDiagnostic['suggestedKarafCommands'] = {};
  if (matchedPomDependency && matchedPomDependency.version) {
    const featureName = matchedPomDependency.artifactId.replace('-service', '');
    suggestedKarafCommands.repoAddCommand =
      `feature:repo-add mvn:${matchedPomDependency.groupId}/${matchedPomDependency.artifactId}/${matchedPomDependency.version}/xml/features`;
    suggestedKarafCommands.installCommand = `feature:install -r -u ${featureName}/${matchedPomDependency.version}`;
  }
  const inspectKeyword = searchKeyword.replace(/[^a-zA-Z0-9_-]/g, '') || 'matcon';
  suggestedKarafCommands.diagnosticCommand = `bundle:list -s | grep ${inspectKeyword}`;

  const formattedBanner = formatOsgiResolutionDiagnostic({
    rootCause,
    rootTarget,
    matchedPomDependency,
    matchedProfileName,
    matchedProjectName,
    versionMismatchWarning
  });

  return {
    isResolutionError: true,
    rootTarget,
    rootCause,
    causesChain,
    matchedPomDependency,
    matchedProfileName,
    matchedProfileId,
    matchedProjectName,
    matchedProjectPath,
    suggestedKarafCommands,
    versionMismatchWarning,
    formattedBanner
  };
}
