import {
  buildFeatureXmlFetchScript,
  checkManifestWithFeatureXml,
  featureXmlPaths,
  parseFeatureXmlFetchOutput,
  parseFeaturesXml,
  type XmlDependencyReport
} from '../../../shared/infrFeatureXml';
import { commandFailureDetail } from '../../../shared/infrNewVersionScripts';
import type { VersionManifest } from '../../../shared/infrVersionManifest';

type Trace = (line: string) => void;

/**
 * Dependências entre features pelos features.xml do Nexus, baixados de dentro do container do WTA de origem (mesma rede
 * e mesmo login do build). Nunca derruba a prévia: o que não der para conferir volta com o motivo em `error`.
 * `run` executa um roteiro sh no container; nada do que sai do Nexus vai para o registro além de contagens.
 */
export async function checkXmlDependencies(
  run: (script: string, timeoutMs: number) => Promise<string>,
  repositories: string[] | null,
  manifest: VersionManifest,
  trace: Trace
): Promise<XmlDependencyReport> {
  const probes = featureXmlPaths(manifest);
  const base: XmlDependencyReport = { repos: probes.length, fetched: 0, missing: 0, checked: 0, withDependencies: 0, issues: [] };
  if (probes.length === 0) {
    trace('Dependências pelos features.xml: a lista não tem repositórios para baixar');
    return { ...base, error: 'a lista não tem repositórios' };
  }
  if (!repositories?.length) {
    trace('Dependências pelos features.xml não conferidas: o Karaf não lista repositórios http');
    return { ...base, error: 'o Karaf não lista repositórios http (ou o container não deixou ler o org.ops4j.pax.url.mvn.cfg)' };
  }
  try {
    const out = await run(buildFeatureXmlFetchScript(repositories, probes.map((p) => p.path)), 150000);
    const fetched = parseFeatureXmlFetchOutput(out);
    if (fetched.noCurl) {
      trace('Dependências pelos features.xml não conferidas: o container não tem curl');
      return { ...base, error: 'o container não tem curl' };
    }
    const features = [...fetched.files.values()].flatMap(parseFeaturesXml);
    const result: XmlDependencyReport = { ...base, fetched: fetched.files.size, missing: fetched.missing.length, ...checkManifestWithFeatureXml(manifest, features) };
    trace(
      `Dependências pelos features.xml: ${result.fetched} de ${result.repos} baixados, ${result.missing} ausentes, ${features.length} features nos XML, ` +
        `${result.checked} da lista achadas, ${result.withDependencies} com dependências, ${result.issues.length} conflito(s)`
    );
    if (result.issues.length > 0) trace(`Conflitos pelos features.xml: ${result.issues.map((i) => `${i.feature} ${i.version} exige ${i.dependency} ${i.required}, a lista tem ${i.found}`).join(' | ')}`);
    return result;
  } catch (err: any) {
    const reason = commandFailureDetail(err);
    trace(`Dependências pelos features.xml não conferidas: ${reason}`);
    return { ...base, error: reason };
  }
}
