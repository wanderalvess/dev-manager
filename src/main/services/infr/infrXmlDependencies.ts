import {
  absentForManifest,
  buildFeatureXmlFetchScript,
  buildKarafCfgScript,
  KARAF_HOME,
  parseKarafCfgOutput,
  reachableXmlPaths,
  checkManifestWithFeatureXml,
  featureXmlPaths,
  parseFeatureXmlFetchOutput,
  parseFeaturesXml,
  MAX_XML_REPOS,
  type XmlDependencyReport
} from '../../../shared/infrFeatureXml';
import { commandFailureDetail } from '../../../shared/infrNewVersionScripts';
import type { VersionManifest } from '../../../shared/infrVersionManifest';

type Trace = (line: string) => void;

/**
 * Dependências entre features pelos features.xml do Nexus, baixados de dentro do container do WTA de origem (mesma rede
 * e mesmo login do build). Nunca derruba a prévia: o que não der para conferir volta com o motivo em `error`.
 * `run` executa um roteiro sh no container; nada do que sai do Nexus vai para o registro além de contagens.
 * Com `existing` (o versions/<versão>.features que já existe), baixa também os XML dele para dizer que features dele o
 * build não acharia.
 */
export async function checkXmlDependencies(
  run: (script: string, timeoutMs: number) => Promise<string>,
  repositories: string[] | null,
  manifest: VersionManifest,
  trace: Trace,
  existing?: VersionManifest | null
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
  const listPaths = [...new Set([...featureXmlPaths(manifest, true), ...(existing ? featureXmlPaths(existing, true) : [])].map((p) => p.path))];
  const paths = listPaths.slice(0, MAX_XML_REPOS);
  const system = `${KARAF_HOME}/system`;
  try {
    // Junto com os XML da lista vem o featuresRepositories do Karaf: as features dele (spring, jdbc...) não estão na lista
    const out = await run(`${buildKarafCfgScript()}\n${buildFeatureXmlFetchScript(repositories, paths, system)}`, 180000);
    const fetched = parseFeatureXmlFetchOutput(out);
    if (fetched.noCurl) {
      trace('Dependências pelos features.xml não conferidas: o container não tem curl');
      return { ...base, error: 'o container não tem curl' };
    }
    const karafPaths = parseKarafCfgOutput(out);
    trace(`Repositórios que o Karaf já traz (featuresRepositories): ${karafPaths.length ? karafPaths.length : 'nenhum lido'}`);
    // O Karaf também registra os <repository> que cada XML puxa; baixa esses em até 3 rodadas, além dos do próprio Karaf
    const missed = new Set(fetched.missing);
    for (let round = 0; round < 3; round++) {
      const pending = reachableXmlPaths([...listPaths, ...karafPaths], fetched.files).pending.filter((p) => !missed.has(p)).slice(0, 60);
      if (pending.length === 0) break;
      const more = parseFeatureXmlFetchOutput(await run(buildFeatureXmlFetchScript(repositories, pending, system), 180000));
      for (const [p, xml] of more.files) fetched.files.set(p, xml);
      for (const p of more.missing) missed.add(p);
      for (const p of pending) if (!more.files.has(p)) missed.add(p);
      trace(`Repositórios puxados pelos XML e pelo Karaf: ${more.files.size} de ${pending.length} baixados`);
    }
    const own = new Set(probes.map((p) => p.path));
    const files = new Map([...fetched.files].filter(([p]) => own.has(p)));
    const features = [...files.values()].flatMap(parseFeaturesXml);
    const absent = absentForManifest(manifest, fetched.files, karafPaths);
    const existingAbsent = existing ? absentForManifest(existing, fetched.files, karafPaths) : undefined;
    const result: XmlDependencyReport = {
      ...base,
      fetched: files.size,
      missing: fetched.missing.filter((p) => own.has(p)).length,
      ...checkManifestWithFeatureXml(manifest, features),
      karafRepos: karafPaths.length,
      ...(absent ? { absent } : {}),
      ...(existingAbsent ? { existingAbsent } : {})
    };
    trace(
      `Dependências pelos features.xml: ${result.fetched} de ${result.repos} baixados, ${result.missing} ausentes, ${features.length} features nos XML, ` +
        `${result.checked} da lista achadas, ${result.withDependencies} com dependências, ${result.issues.length} conflito(s)`
    );
    if (result.issues.length > 0) trace(`Conflitos pelos features.xml: ${result.issues.map((i) => `${i.feature} ${i.version} exige ${i.dependency} ${i.required}, a lista tem ${i.found}`).join(' | ')}`);
    const absentText = (xs: typeof absent) => (xs === undefined ? 'não conferido (faltou algum XML)' : xs.length ? xs.map((a) => `${a.name} ${a.version}`).join(', ') : 'nenhuma');
    trace(`Features sem repositório na lista nova: ${absentText(absent)}${existing ? `; na lista existente: ${absentText(existingAbsent)}` : ''}`);
    return result;
  } catch (err: any) {
    const reason = commandFailureDetail(err);
    trace(`Dependências pelos features.xml não conferidas: ${reason}`);
    return { ...base, error: reason };
  }
}
