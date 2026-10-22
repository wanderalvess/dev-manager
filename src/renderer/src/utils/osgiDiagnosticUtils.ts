export interface OsgiDiagnosticExplanation {
  causeText: string;
  solutionText: string;
  requirementLabel: string;
}

/**
 * Traduz o erro técnico de resolução OSGi (ResolutionException / missing requirement)
 * para uma explicação clara em linguagem humana com causa raiz e solução recomendada.
 */
export function buildOsgiDiagnosticExplanation(diagnostic: {
  failingBundle: string;
  missingItem: string;
  requirementType: 'package' | 'bundle' | 'service' | 'identity' | 'generic';
  versionRangeDesc?: string;
  matchedProfileName?: string;
  matchedProjectName?: string;
  matchedPomDependency?: { version?: string };
}): OsgiDiagnosticExplanation {
  const reqLabels: Record<string, string> = {
    package: 'pacote Java',
    bundle: 'bundle OSGi',
    service: 'serviço OSGi',
    identity: 'componente/feature',
    generic: 'requisito'
  };

  const requirementLabel = reqLabels[diagnostic.requirementType] || 'requisito';
  const rangeInfo = diagnostic.versionRangeDesc ? ` (faixa ${diagnostic.versionRangeDesc})` : '';

  const causeText = `O bundle "${diagnostic.failingBundle}" exige que o ${requirementLabel} "${diagnostic.missingItem}"${rangeInfo} esteja ativo no Karaf, mas ele ainda não foi publicado ou iniciado no contêiner local.`;

  let solutionText: string;
  if (diagnostic.matchedProfileName) {
    solutionText = `Execute o perfil de deploy cadastrado "${diagnostic.matchedProfileName}" para compilar e publicar este módulo no Karaf. Após a conclusão, execute novamente este perfil.`;
  } else if (diagnostic.matchedProjectName) {
    solutionText = `Compile e faça o deploy do projeto local "${diagnostic.matchedProjectName}" para registrar a versão necessária no Karaf.`;
  } else if (
    diagnostic.matchedPomDependency?.version &&
    !diagnostic.matchedPomDependency.version.toUpperCase().includes('SNAPSHOT')
  ) {
    solutionText = `Instale a versão de release oficial (${diagnostic.matchedPomDependency.version}) diretamente do Nexus via comandos Karaf ou ajuste a dependência no pom.xml.`;
  } else {
    solutionText = `Verifique se o bundle que fornece "${diagnostic.missingItem}" está instalado e ativo no Karaf (use o comando bundle:list).`;
  }

  return {
    causeText,
    solutionText,
    requirementLabel
  };
}
