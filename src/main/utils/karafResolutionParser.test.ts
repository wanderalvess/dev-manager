import { describe, it, expect } from 'vitest';
import {
  stripAnsi,
  parseVersionFilter,
  parseOsgiResolutionError,
  extractPomDependencies,
  correlateWithPomDependencies,
  diagnoseKarafResolutionError
} from './karafResolutionParser';

describe('karafResolutionParser', () => {
  const REAL_KARAF_ERROR = `
    \u001b[31mError executing command: Unable to resolve root: missing requirement [root] osgi.identity; osgi.identity=winthor-integracao-varejo; type=karaf.feature; version="[0.0.1.SNAPSHOT,0.0.1.SNAPSHOT]"; filter:="(&(osgi.identity=winthor-integracao-varejo)(type=karaf.feature)(version>=0.0.1.SNAPSHOT)(version<=0.0.1.SNAPSHOT))" [caused by: Unable to resolve winthor-integracao-varejo/0.0.1.SNAPSHOT: missing requirement [winthor-integracao-varejo/0.0.1.SNAPSHOT] osgi.identity; osgi.identity=winthor-integracao-varejo-service; type=osgi.bundle; version="[0.0.1.SNAPSHOT,0.0.1.SNAPSHOT]"; resolution:=mandatory [caused by: Unable to resolve winthor-integracao-varejo-service/0.0.1.SNAPSHOT: missing requirement [winthor-integracao-varejo-service/0.0.1.SNAPSHOT] osgi.wiring.package; filter:="(&(osgi.wiring.package=com.br.com.pcsist.winthor.varejo.matcon.domain.cancelamentofaturamento)(version>=1.39.0)(!(version>=2.0.0)))"]]\u001b[39m
  `;

  const SAMPLE_POM = `
    <project xmlns="http://maven.apache.org/POM/4.0.0">
      <dependencies>
        <dependency>
          <groupId>org.apache.commons</groupId>
          <artifactId>commons-lang3</artifactId>
          <version>3.12.0</version>
        </dependency>
        <!-- Dependência do Matcon comentada em SNAPSHOT -->
        <dependency>
          <groupId>com.br.com.pcsist.winthor.varejo</groupId>
          <artifactId>winthor-integracao-matcon-service</artifactId>
          <version>1.39.23.45</version>
          <!--<version>0.0.1-SNAPSHOT</version>-->
        </dependency>
      </dependencies>
    </project>
  `;

  it('stripAnsi deve remover escapes ANSI e tags de cores', () => {
    const raw = '\u001b[31mErro fatal[39m [1;32mSucesso[0m';
    expect(stripAnsi(raw)).toBe('Erro fatal Sucesso');
  });

  it('parseVersionFilter deve extrair versão mínima e máxima de filtros LDAP OSGi', () => {
    const filter = '(&(osgi.wiring.package=com.teste)(version>=1.39.0)(!(version>=2.0.0)))';
    const parsed = parseVersionFilter(filter);
    expect(parsed.versionMin).toBe('1.39.0');
    expect(parsed.versionMax).toBe('2.0.0');
    expect(parsed.versionRangeDesc).toContain('1.39.0');
    expect(parsed.versionRangeDesc).toContain('2.0.0');
  });

  it('parseOsgiResolutionError deve dissecar erro real do Karaf com cadeia de causas aninhadas', () => {
    const result = parseOsgiResolutionError(REAL_KARAF_ERROR);
    expect(result).not.toBeNull();
    expect(result!.rootTarget).toBe('root');
    expect(result!.causesChain.length).toBeGreaterThanOrEqual(2);

    const rootCause = result!.rootCause;
    expect(rootCause.bundleName).toBe('winthor-integracao-varejo-service');
    expect(rootCause.bundleVersion).toBe('0.0.1.SNAPSHOT');
    expect(rootCause.requirementType).toBe('package');
    expect(rootCause.missingItem).toBe('com.br.com.pcsist.winthor.varejo.matcon.domain.cancelamentofaturamento');
    expect(rootCause.versionMin).toBe('1.39.0');
    expect(rootCause.versionMax).toBe('2.0.0');
  });

  it('extractPomDependencies deve ignorar dependências em comentários e extrair tags reais', () => {
    const deps = extractPomDependencies(SAMPLE_POM);
    expect(deps.length).toBe(2);
    expect(deps[1].artifactId).toBe('winthor-integracao-matcon-service');
    expect(deps[1].version).toBe('1.39.23.45');
  });

  it('correlateWithPomDependencies deve associar o pacote ausente com o artifact do POM', () => {
    const matched = correlateWithPomDependencies(
      'com.br.com.pcsist.winthor.varejo.matcon.domain.cancelamentofaturamento',
      SAMPLE_POM
    );
    expect(matched).not.toBeNull();
    expect(matched!.artifactId).toBe('winthor-integracao-matcon-service');
    expect(matched!.version).toBe('1.39.23.45');
    expect(matched!.groupId).toBe('com.br.com.pcsist.winthor.varejo');
  });

  it('diagnoseKarafResolutionError deve orquestrar diagnóstico completo com perfis e projetos', () => {
    const diag = diagnoseKarafResolutionError({
      rawOutput: REAL_KARAF_ERROR,
      pomXmlContent: SAMPLE_POM,
      deployProfiles: [
        {
          id: 'deploy-profile-matcon',
          name: 'matcon',
          steps: [{ command: 'feature:install -r -u winthor-integracao-matcon/0.0.1-SNAPSHOT' }]
        },
        {
          id: 'deploy-profile-varejo',
          name: 'varejo',
          steps: [{ command: 'feature:install -r -u winthor-integracao-varejo/0.0.1-SNAPSHOT' }]
        }
      ],
      projects: [
        {
          name: 'WTAVAR-winthor-integracao-matcon',
          path: 'C:\\projetos\\WTAVAR-winthor-integracao-matcon'
        }
      ]
    });

    expect(diag).not.toBeNull();
    expect(diag!.isResolutionError).toBe(true);
    expect(diag!.matchedPomDependency?.artifactId).toBe('winthor-integracao-matcon-service');
    expect(diag!.matchedProfileName).toBe('matcon');
    expect(diag!.matchedProjectName).toBe('WTAVAR-winthor-integracao-matcon');
    expect(diag!.suggestedKarafCommands.installCommand).toBe('feature:install -r -u winthor-integracao-matcon/1.39.23.45');
    expect(diag!.versionMismatchWarning).toContain('Release específica (1.39.23.45');
    expect(diag!.formattedBanner).toContain('DIAGNÓSTICO INTELIGENTE DE DEPENDÊNCIA OSGi');
    expect(diag!.formattedBanner).toContain('winthor-integracao-matcon-service:1.39.23.45');
    expect(diag!.formattedBanner).toContain('Perfil de Deploy cadastrado: "matcon"');
  });

  it('diagnoseKarafResolutionError deve retornar null para comandos com saídas normais ou outros erros', () => {
    const normalOutput = 'Refreshing bundles: [102, 103]\nDone.';
    expect(diagnoseKarafResolutionError({ rawOutput: normalOutput })).toBeNull();

    const authError = 'Authentication failed: invalid username/password';
    expect(diagnoseKarafResolutionError({ rawOutput: authError })).toBeNull();
  });
});
