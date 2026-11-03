/**
 * Os repositórios novos de uma versão (os `repo mvn:...` que a Nova versão acrescenta à lista) precisam existir no
 * Nexus que o WTA usa; senão o build termina em "Unable to resolve" depois de 30 minutos. Aqui ficam as partes puras
 * da conferência: traduzir o `mvn:` para o caminho do Maven, ler os repositórios que o Karaf usa (pax-url), montar o
 * script que testa cada artefato de dentro do container (mesma rede e mesmo acesso do WTA) e classificar o resultado.
 */
import type { Routine801CatalogResponse } from './types';
import { catalogRepoFor, type ManifestChange, type VersionManifest } from './infrVersionManifest';

/** `mvn:grupo/artefato/versão/xml/features` → caminho do features.xml num repositório Maven. */
export function mvnFeaturePath(mvn: string): string | null {
  const m = /^mvn:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/xml(?:\/features)?$/.exec(mvn.trim());
  if (!m) return null;
  const [, group, artifact, version] = m;
  return `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}-features.xml`;
}

const PAX_OPTION = /^(?:id=|snapshots$|noreleases$|releases$|multi$|update=|checksum=|releasesUpdate=|snapshotsUpdate=|releasesChecksum=|snapshotsChecksum=|connectionTimeout=|readTimeout=)/;
/** URL que pode ir entre aspas simples num roteiro: http(s), sem espaço, aspas, crase ou barra invertida. */
export const SAFE_REPO_URL = /^https?:\/\/[^\s'"`\\]+$/;

/** Esconde `usuário:senha@` de uma URL, para o que vai para o registro e para a tela. */
export const maskUrlCredentials = (url: string): string => url.replace(/(https?:\/\/)[^/@\s]+@/i, '$1***@');

/** Tira as opções do pax-url (`@id=x@snapshots`) sem cortar o `usuário:senha@` que a URL pode ter. */
function stripPaxOptions(entry: string): string {
  const parts = entry.trim().split('@');
  let url = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (PAX_OPTION.test(parts[i])) break;
    url += `@${parts[i]}`;
  }
  return url.replace(/\/+$/, '');
}

/**
 * Repositórios http(s) do `org.ops4j.pax.url.mvn.cfg`, sem as opções e sem a barra final. A URL pode trazer
 * `usuário:senha@` (o Nexus da PC tem): ela segue inteira para o curl, e quem registra ou mostra usa o maskUrlCredentials.
 */
export function parsePaxRepositories(cfg: string): string[] {
  const joined = cfg.replace(/\\\r?\n/g, ' ');
  const urls: string[] = [];
  for (const key of ['org.ops4j.pax.url.mvn.repositories', 'org.ops4j.pax.url.mvn.defaultRepositories']) {
    const line = joined.split(/\r?\n/).find((l) => l.trim().startsWith(`${key}`) && l.includes('='));
    if (!line) continue;
    for (const part of line.slice(line.indexOf('=') + 1).split(',')) {
      const url = stripPaxOptions(part);
      if (SAFE_REPO_URL.test(url) && !urls.includes(url)) urls.push(url);
    }
  }
  return urls;
}

export interface ArtifactProbe {
  /** O `mvn:` da lista e o caminho dele no repositório */
  mvn: string;
  path: string;
}

/** Repositórios que a lista nova acrescenta à origem: são os artefatos que ainda ninguém resolveu. */
export function newRepoProbes(manifest: VersionManifest, origin: VersionManifest): ArtifactProbe[] {
  const probes: ArtifactProbe[] = [];
  for (const mvn of manifest.repos) {
    if (origin.repos.includes(mvn)) continue;
    const path = mvnFeaturePath(mvn);
    if (path) probes.push({ mvn, path });
  }
  return probes;
}

/** Script (sh) que imprime `<código HTTP> <caminho>` por artefato, tentando cada repositório; 000 = sem rede. */
export function buildArtifactProbeScript(repositories: string[], probes: ArtifactProbe[]): string {
  const repos = repositories.filter((r) => SAFE_REPO_URL.test(r));
  const paths = probes.map((p) => p.path).filter((p) => /^[A-Za-z0-9_./-]+$/.test(p));
  return [
    'command -v curl >/dev/null 2>&1 || { echo NOCURL; exit 0; }',
    `for p in ${paths.map((p) => `'${p}'`).join(' ')}; do`,
    '  best=404',
    `  for r in ${repos.map((r) => `'${r}'`).join(' ')}; do`,
    '    c=$(curl -s -o /dev/null -I -m 15 -w "%{http_code}" "$r/$p" 2>/dev/null || echo 000)',
    '    case "$c" in 200) best=200; break;; 401|403|000) best=$c;; esac',
    '  done',
    '  echo "$best $p"',
    'done'
  ].join('\n');
}

export type ArtifactStatus = 'found' | 'missing' | 'unverified';

export interface ArtifactReport {
  /** Artefatos que o teste tentou */
  checked: number;
  /** `mvn:` que nenhum repositório tem (404 em todos) */
  missing: string[];
  /** Não deu para saber (sem curl, sem rede, repositório pedindo login) */
  unverified: number;
  /** Repositórios que o Karaf usa e foram testados */
  repositories: string[];
  /** Features trocadas que não ganharam repositório próprio na lista */
  withoutRepo: string[];
  error?: string;
}

export function parseArtifactProbeOutput(output: string, probes: ArtifactProbe[], repositories: string[]): ArtifactReport {
  const report: ArtifactReport = { checked: probes.length, missing: [], unverified: 0, repositories, withoutRepo: [] };
  if (/^NOCURL/m.test(output)) {
    report.unverified = probes.length;
    report.error = 'o container não tem curl';
    return report;
  }
  const codes = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    const m = /^(\d{3}) (\S+)$/.exec(line.trim());
    if (m) codes.set(m[2], m[1]);
  }
  for (const p of probes) {
    const code = codes.get(p.path);
    if (code === '200') continue;
    if (code === '404') report.missing.push(p.mvn);
    else report.unverified++;
  }
  return report;
}

/** Features trocadas cujo repositório (o da feature ou o da versão no catálogo) não entrou na lista. */
export function featuresWithoutRepo(manifest: VersionManifest, catalog: Routine801CatalogResponse, changes: ManifestChange[]): string[] {
  const out: string[] = [];
  for (const c of changes) {
    const repo = catalogRepoFor(c.name, c.to, catalog);
    if (!repo || !manifest.repos.includes(repo)) out.push(`${c.name} ${c.to}`);
  }
  return out;
}
