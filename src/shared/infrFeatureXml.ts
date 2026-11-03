/**
 * Dependências entre features lidas dos `features.xml` dos repositórios do Nexus. O catálogo da rotina 801 quase não traz
 * `dependencias` (numa prévia real vieram 0 em 7 features), mas cada repositório da lista tem um features.xml com, para cada
 * feature, as features de que ela depende e a faixa de versão (`<feature version="[1.8,2)">winthor-core-data</feature>`).
 * Aqui ficam o parser desse XML, o script que baixa os arquivos de dentro do container do WTA (mesma rede e mesmo login do
 * build) e a conferência da lista contra as faixas.
 *
 * Limite conhecido: isto vê só dependência declarada entre FEATURES. Conflito de PACOTE entre bundles (o
 * `osgi.wiring.package=...core.data;version>=1.40` do Karaf) vem do MANIFEST dos jars e não está no XML: quem pega é o
 * ensaio no Karaf de origem.
 */
import { SAFE_REPO_URL, mvnFeaturePath } from './infrFeatureArtifacts';
import { satisfiesSpec, type DependencyIssue, type DependencyReport } from './infrFeatureDependencies';
import { compareVersions, type ManifestChange, type VersionManifest } from './infrVersionManifest';

export interface XmlFeatureDependency {
  name: string;
  /** Faixa ou versão mínima declarada; vazia = qualquer */
  range?: string;
}

export interface XmlFeature {
  name: string;
  version: string;
  dependencies: XmlFeatureDependency[];
}

const attr = (attrs: string, name: string): string | undefined => new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs)?.slice(1).find((v) => v !== undefined);

/** Features de um `features.xml` do Karaf e as features de que cada uma depende. XML inválido ou vazio devolve []. */
export function parseFeaturesXml(xml: string): XmlFeature[] {
  const text = xml.replace(/<!--[\s\S]*?-->/g, '');
  const list: XmlFeature[] = [];
  const re = /<(\/?)feature\b([^>]*?)(\/?)>/g;
  let current: XmlFeature | null = null;
  let nested: { range?: string; start: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const [, close, attrs, selfClose] = m;
    if (!close) {
      if (!current) {
        const name = attr(attrs, 'name');
        if (!name) continue;
        current = { name, version: attr(attrs, 'version') ?? '0.0.0', dependencies: [] };
        if (selfClose) {
          list.push(current);
          current = null;
        }
      } else if (!selfClose) {
        nested = { range: attr(attrs, 'version'), start: re.lastIndex };
      }
    } else if (nested && current) {
      const name = text.slice(nested.start, m.index).trim();
      if (/^[\w.-]+$/.test(name)) current.dependencies.push({ name, ...(nested.range ? { range: nested.range } : {}) });
      nested = null;
    } else if (current) {
      list.push(current);
      current = null;
    }
  }
  return list;
}

const SAFE_PATH = /^[A-Za-z0-9_./-]+$/;
/** No máximo estes repositórios por prévia (a lista nova e a existente juntas): protege o tempo e a rede. */
export const MAX_XML_REPOS = 140;
const MAX_XML_BYTES = 120000;

/** Repositórios da lista (`repo mvn:...`) e o caminho do features.xml de cada um no Maven; `all` sem o limite. */
export function featureXmlPaths(manifest: VersionManifest, all = false): { mvn: string; path: string }[] {
  const out: { mvn: string; path: string }[] = [];
  for (const mvn of manifest.repos) {
    const path = mvnFeaturePath(mvn);
    if (path && SAFE_PATH.test(path)) out.push({ mvn, path });
  }
  return all ? out : out.slice(0, MAX_XML_REPOS);
}

/**
 * Script (sh, DENTRO do container) que baixa os features.xml em paralelo (8 por vez), tentando cada repositório do Karaf,
 * e imprime `@@FILE <caminho>`, o XML e `@@END` (ou `@@MISS <caminho>` quando nenhum repositório tem).
 */
export function buildFeatureXmlFetchScript(repositories: string[], paths: string[]): string {
  const repos = repositories.filter((r) => SAFE_REPO_URL.test(r));
  const list = paths.filter((p) => SAFE_PATH.test(p));
  return [
    'command -v curl >/dev/null 2>&1 || { echo NOCURL; exit 0; }',
    'dir=/tmp/hub-xml; rm -rf "$dir"; mkdir -p "$dir"',
    // Uma lista entre aspas simples (as URLs validadas não têm espaço nem aspas): a expansão `$REPOS` as separa sem deixar aspas nelas
    `REPOS='${repos.join(' ')}'`,
    'fetch() {',
    '  p="$1"; n="$2"; f="$dir/$n.xml"',
    '  for r in $REPOS; do',
    '    c=$(curl -s -m 15 -o "$f" -w "%{http_code}" "$r/$p" 2>/dev/null || echo 000)',
    '    if [ "$c" = "200" ]; then { echo "@@FILE $p"; head -c ' + MAX_XML_BYTES + ' "$f"; echo; echo "@@END"; } > "$dir/$n.out"; rm -f "$f"; return; fi',
    '  done',
    '  echo "@@MISS $p" > "$dir/$n.out"; rm -f "$f"',
    '}',
    'i=0',
    `for p in ${list.map((p) => `'${p}'`).join(' ')}; do`,
    '  fetch "$p" "$i" &',
    '  i=$((i+1))',
    '  [ $((i % 8)) -eq 0 ] && wait',
    'done',
    'wait',
    'cat "$dir"/*.out 2>/dev/null',
    'rm -rf "$dir"'
  ].join('\n');
}

export interface XmlFetchResult {
  /** Caminho do features.xml → conteúdo */
  files: Map<string, string>;
  /** Caminhos que nenhum repositório do Karaf tinha */
  missing: string[];
  /** O container não tem curl */
  noCurl?: boolean;
}

export function parseFeatureXmlFetchOutput(output: string): XmlFetchResult {
  const result: XmlFetchResult = { files: new Map(), missing: [] };
  if (/^NOCURL/m.test(output)) return { ...result, noCurl: true };
  const lines = output.split(/\r?\n/);
  let path: string | null = null;
  let body: string[] = [];
  for (const line of lines) {
    const file = /^@@FILE (\S+)$/.exec(line);
    const miss = /^@@MISS (\S+)$/.exec(line);
    if (file) {
      path = file[1];
      body = [];
    } else if (miss) result.missing.push(miss[1]);
    else if (line === '@@END' && path) {
      result.files.set(path, body.join('\n'));
      path = null;
    } else if (path) body.push(line);
  }
  return result;
}

export interface XmlDependencyReport {
  /** Repositórios da lista que o Hub tentou baixar, os que vieram e os que nenhum repositório do Karaf tinha */
  repos: number;
  fetched: number;
  missing: number;
  /** Features da lista achadas nos XML, e dessas as que declaram dependências de feature */
  checked: number;
  withDependencies: number;
  issues: DependencyIssue[];
  /** Features da lista nova que nenhum repositório dela define (só quando todos os XML da lista vieram) */
  absent?: AbsentFeature[];
  /** O mesmo para o versions/<versão>.features que já existe */
  existingAbsent?: AbsentFeature[];
  /** Por que não deu para conferir (sem curl, sem repositórios, falha do comando) */
  error?: string;
}

/**
 * Features ausentes de uma lista, olhando só os XML dos repositórios DELA (o build não vê os da outra lista). Undefined se
 * algum XML da lista não veio: sem ele, uma feature pareceria ausente sem estar.
 */
export function absentForManifest(manifest: VersionManifest, files: Map<string, string>): AbsentFeature[] | undefined {
  const paths = featureXmlPaths(manifest, true).map((p) => p.path);
  if (paths.some((p) => !files.has(p))) return undefined;
  return featuresAbsentFromXml(manifest, paths.flatMap((p) => parseFeaturesXml(files.get(p) as string)));
}

/**
 * Confere a lista contra as dependências dos features.xml: uma feature da lista que exige outra, numa faixa, e a lista tem a
 * outra fora da faixa. Só acusa conflito (a outra está na lista e não atende); dependência que não está na lista não é
 * acusada, porque o Karaf a puxa dos repositórios que o próprio XML declara.
 */
export function checkManifestWithFeatureXml(manifest: VersionManifest, features: XmlFeature[]): Pick<XmlDependencyReport, 'checked' | 'withDependencies' | 'issues'> {
  const byKey = new Map(features.map((f) => [`${f.name}@${f.version}`, f]));
  const inManifest = new Map(manifest.features.map((f) => [f.name, f.version]));
  const issues: DependencyIssue[] = [];
  let checked = 0;
  let withDependencies = 0;
  for (const f of manifest.features) {
    const x = byKey.get(`${f.name}@${f.version}`);
    if (!x) continue;
    checked++;
    if (x.dependencies.length === 0) continue;
    withDependencies++;
    for (const d of x.dependencies) {
      const found = inManifest.get(d.name);
      if (found === undefined || !d.range) continue;
      if (satisfiesSpec(found, d.range) === false) {
        issues.push({ feature: f.name, version: f.version, dependency: d.name, required: d.range, found, kind: 'conflict', source: 'xml' });
      }
    }
  }
  return { checked, withDependencies, issues };
}

/** Feature da lista que nenhum features.xml dos repositórios dela define nessa versão, e as versões que eles têm. */
export interface AbsentFeature {
  name: string;
  version: string;
  available: string[];
}

/**
 * Features da lista que o build não acharia: o install_features.sh só procura nos `repo mvn:` da própria lista e para em
 * "Feature X/versão não existe em nenhum repositório da lista". `features` deve vir só dos XML desses repositórios.
 */
export function featuresAbsentFromXml(manifest: VersionManifest, features: XmlFeature[]): AbsentFeature[] {
  const versions = new Map<string, Set<string>>();
  for (const f of features) versions.set(f.name, (versions.get(f.name) ?? new Set()).add(f.version));
  return manifest.features
    .filter((f) => !versions.get(f.name)?.has(f.version))
    .map((f) => ({ name: f.name, version: f.version, available: [...(versions.get(f.name) ?? [])].sort((a, b) => compareVersions(b, a)) }));
}

/**
 * Volta cada feature ausente para a versão mais nova que os repositórios da lista têm dela; a que não tem nenhuma fica em
 * `unresolved` (precisa de um `repo mvn:` novo, que só a pessoa sabe qual é).
 */
export function repairAbsentFeatures(manifest: VersionManifest, absent: AbsentFeature[]): { manifest: VersionManifest; repairs: ManifestChange[]; unresolved: AbsentFeature[] } {
  const repairs: ManifestChange[] = [];
  const unresolved: AbsentFeature[] = [];
  const target = new Map<string, string>();
  for (const a of absent) {
    if (a.available.length === 0) unresolved.push(a);
    else {
      target.set(a.name, a.available[0]);
      repairs.push({ name: a.name, from: a.version, to: a.available[0], reason: `a ${a.version} não está em nenhum repositório da lista` });
    }
  }
  const features = manifest.features.map((f) => (target.has(f.name) ? { name: f.name, version: target.get(f.name) as string } : f));
  return { manifest: { ...manifest, features }, repairs, unresolved };
}

/** Junta o que os features.xml acharam ao relatório de dependências do catálogo, sem repetir o mesmo conflito. */
export function withXmlDependencies(dep: DependencyReport, xml: XmlDependencyReport): DependencyReport {
  const key = (i: DependencyIssue) => `${i.feature}|${i.dependency}|${i.required}`;
  const seen = new Set(dep.issues.map(key));
  return {
    ...dep,
    withDependencies: dep.withDependencies + xml.withDependencies,
    issues: [...dep.issues, ...xml.issues.filter((i) => !seen.has(key(i)))],
    xml: { repos: xml.repos, fetched: xml.fetched, missing: xml.missing, checked: xml.checked, withDependencies: xml.withDependencies, ...(xml.error ? { error: xml.error } : {}) }
  };
}
