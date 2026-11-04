import { describe, expect, it, vi } from 'vitest';
import { checkXmlDependencies } from './infrXmlDependencies';
import type { VersionManifest } from '../../../shared/infrVersionManifest';

const OWN = 'br/com/pcsist/winthor/core/winthor-core-features/1.40.0.3/winthor-core-features-1.40.0.3-features.xml';
const SPRING = 'org/apache/karaf/features/spring/4.2.9/spring-4.2.9-features.xml';
const LEGACY = 'org/apache/karaf/features/spring-legacy/4.2.9/spring-legacy-4.2.9-features.xml';

const XML: Record<string, string> = {
  [OWN]: '<features><feature name="winthor-core-data" version="1.40.0.3"/></features>',
  [SPRING]: '<features><feature name="spring" version="4.2.9.RELEASE_1"/><repository>mvn:org.apache.karaf.features/spring-legacy/4.2.9/xml/features</repository></features>',
  [LEGACY]: '<features><feature name="spring-jdbc" version="4.2.9.RELEASE_1"/></features>'
};

const CFG = 'featuresRepositories = \\\n  mvn:org.apache.karaf.features/spring/4.2.9/xml/features';

/** Container falso: devolve o cfg do Karaf quando o roteiro pede e os XML que conhece, no formato do roteiro de coleta. */
function fakeContainer(known: Record<string, string>) {
  return vi.fn(async (script: string) => {
    const paths = [...script.matchAll(/'([A-Za-z0-9_./-]+-features\.xml)'/g)].map((m) => m[1]);
    const files = paths.map((p) => (p in known ? `@@FILE ${p}\n${known[p]}\n@@END` : `@@MISS ${p}`));
    return [script.includes('@@KARAFCFG') ? `@@KARAFCFG\n${CFG}\n\n@@KARAFCFG_END` : '', ...files].join('\n');
  });
}

const lista: VersionManifest = {
  repos: ['mvn:br.com.pcsist.winthor.core/winthor-core-features/1.40.0.3/xml/features'],
  features: [
    { name: 'winthor-core-data', version: '1.40.0.3' },
    { name: 'spring', version: '4.2.9.RELEASE_1' },
    { name: 'spring-jdbc', version: '4.2.9.RELEASE_1' }
  ],
  disabled: []
};

describe('checkXmlDependencies', () => {
  it('features do Karaf (spring, e as que o repositório dele puxa) não contam como sem repositório na lista', async () => {
    const run = fakeContainer(XML);
    const r = await checkXmlDependencies(run, ['https://nexus/repo'], lista, () => {}, lista);
    expect(r.karafRepos).toBe(1);
    expect(r.absent).toEqual([]);
    expect(r.existingAbsent).toEqual([]);
    // Rodada 1: lista + cfg; rodada 2: spring do Karaf; rodada 3: spring-legacy puxado pelo XML dele
    expect(run).toHaveBeenCalledTimes(3);
    expect(run.mock.calls[1][0]).toContain("LOCAL='/opt/pcsist/produtos/winthor/system'");
  });

  it('feature que nem o Karaf tem continua ausente; repositório puxado que não veio não trava a conferência', async () => {
    const run = fakeContainer({ [OWN]: XML[OWN], [SPRING]: XML[SPRING] });
    const r = await checkXmlDependencies(run, ['https://nexus/repo'], lista, () => {});
    expect(r.absent?.map((a) => a.name)).toEqual(['spring-jdbc']);
    expect(run).toHaveBeenCalledTimes(3);
  });
});
