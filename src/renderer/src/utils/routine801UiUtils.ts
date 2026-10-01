import { Routine801Feature, Routine801Repository, Routine801RepositoryUpdate } from '../../../shared/types';

/**
 * Infere a URL canônica Maven padrão do WinThor para o repositório de features
 * caso o catálogo da Rotina 801 não retorne um repositório explícito.
 */
export function inferFeatureMavenUrl(
  feature: Pick<Routine801Feature, 'nome' | 'versao' | 'tipoProjeto'>
): string {
  const isRotina = String(feature.tipoProjeto || '').toUpperCase() === 'ROTINA';
  const groupId = isRotina ? 'br.com.pcsist.winthor.rotina' : 'br.com.pcsist.winthor.servico';
  const cleanName = (feature.nome || '').trim();
  const artifactId = cleanName.endsWith('-features') ? cleanName : `${cleanName}-features`;
  const version = (feature.versao || '1.0.0').trim();

  return `mvn:${groupId}/${artifactId}/${version}/xml/features`;
}

/**
 * Extrai famílias ou linhas de versão distintas (ex: "1.39", "1.38", "0.39") ordenadas decrescente.
 */
export function extractVersionFamilies(features: Routine801Feature[]): string[] {
  const families = new Set<string>();

  for (const f of features) {
    if (!f.versao) continue;
    const cleanVer = f.versao.trim();
    const match = cleanVer.match(/^(\d+\.\d+)/);
    if (match) {
      families.add(match[1]);
    } else {
      families.add(cleanVer);
    }
  }

  return Array.from(families).sort((a, b) => {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const valA = isNaN(partsA[i]) ? 0 : partsA[i];
      const valB = isNaN(partsB[i]) ? 0 : partsB[i];
      if (valA !== valB) return valB - valA;
    }
    return b.localeCompare(a);
  });
}

/**
 * Filtra funcionalidades da Rotina 801 com base em busca textual, tipo de projeto, status e versão.
 */
export function filterRoutine801Features(
  features: Routine801Feature[],
  search: string,
  typeFilter: string = 'ALL',
  statusFilter: string = 'ALL',
  versionFilter: string = 'ALL'
): Routine801Feature[] {
  const query = (search || '').toLowerCase().trim();
  const normalizedType = (typeFilter || 'ALL').toUpperCase();
  const normalizedStatus = (statusFilter || 'ALL').toUpperCase();
  const normalizedVersion = (versionFilter || 'ALL').trim();

  return features.filter((feat) => {
    // Filtro de versão (ex: "1.38", "1.39", "0.39")
    if (normalizedVersion !== 'ALL' && normalizedVersion !== '') {
      const v = (feat.versao || '').trim();
      const matchesVer = v.startsWith(normalizedVersion) || v.includes(normalizedVersion);
      if (!matchesVer) return false;
    }

    // Filtro de tipo (SERVICO, ROTINA)
    if (normalizedType !== 'ALL') {
      const featType = (feat.tipoProjeto || '').toUpperCase();
      if (featType !== normalizedType) return false;
    }

    // Filtro de status (P / LIBERADO, H / HOMOLOGACAO)
    if (normalizedStatus !== 'ALL') {
      const featStatus = (feat.status || '').toUpperCase();
      if (normalizedStatus === 'P' || normalizedStatus === 'LIBERADO') {
        if (featStatus !== 'LIBERADO') return false;
      } else if (normalizedStatus === 'H' || normalizedStatus === 'HOMOLOGACAO') {
        if (featStatus !== 'HOMOLOGACAO') return false;
      } else if (featStatus !== normalizedStatus) {
        return false;
      }
    }

    // Filtro textual
    if (query) {
      const matchName = feat.nome.toLowerCase().includes(query);
      const matchDesc = feat.descricao.toLowerCase().includes(query);
      const matchVer = feat.versao.toLowerCase().includes(query);
      const matchRotina = feat.codigoRotina > 0 && String(feat.codigoRotina).includes(query);
      const matchModulo = feat.codigoModulo > 0 && String(feat.codigoModulo).includes(query);

      if (!matchName && !matchDesc && !matchVer && !matchRotina && !matchModulo) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Localiza o repositório Maven correspondente a uma funcionalidade na lista de repositórios do catálogo.
 */
export function findRepositoryForFeatureUi(
  feature: Pick<Routine801Feature, 'nome' | 'versao'>,
  repositorios: Routine801RepositoryUpdate[]
): Routine801Repository | null {
  if (!feature.nome || !repositorios?.length) return null;

  const cleanName = feature.nome.toLowerCase().trim();

  // 1. Correspondência exata ou com sufixos de features
  for (const item of repositorios) {
    const art = (item.repositorio?.artifactId || '').toLowerCase().trim();
    if (
      art === cleanName ||
      art === `${cleanName}-features` ||
      art === `${cleanName}-feature` ||
      cleanName === `${art}-features` ||
      cleanName === `${art}-feature`
    ) {
      return item.repositorio;
    }
  }

  // 2. Correspondência por contenção
  for (const item of repositorios) {
    const art = (item.repositorio?.artifactId || '').toLowerCase().trim();
    if (art.includes(cleanName) || cleanName.includes(art)) {
      if (!feature.versao || item.repositorio.version === feature.versao) {
        return item.repositorio;
      }
    }
  }

  // 3. Fallback
  for (const item of repositorios) {
    const art = (item.repositorio?.artifactId || '').toLowerCase().trim();
    if (art && (art.includes(cleanName) || cleanName.includes(art))) {
      return item.repositorio;
    }
  }

  return null;
}

/**
 * Constrói os comandos de console Karaf para exibição no Inspector HUD.
 */
export function buildKarafInstallCommandsUi(
  feature: Routine801Feature,
  repo?: Routine801Repository | null,
  autoInferRepo: boolean = true
): { repoCommand?: string; installCommand: string; fullSnippet: string } {
  let repoCommand: string | undefined;

  const targetMavenUrl =
    repo?.featureMavenUrl ||
    feature.featureMavenUrl ||
    (repo?.groupId && repo?.artifactId && repo?.version
      ? `mvn:${repo.groupId}/${repo.artifactId}/${repo.version}/xml/features`
      : autoInferRepo && feature.nome && feature.versao
        ? inferFeatureMavenUrl(feature)
        : undefined);

  if (targetMavenUrl) {
    repoCommand = `feature:repo-add ${targetMavenUrl}`;
  }

  const featureTarget = feature.versao ? `${feature.nome}/${feature.versao}` : feature.nome;
  const installCommand = `feature:install -r -u ${featureTarget}`;

  const fullSnippet = repoCommand ? `${repoCommand}\n${installCommand}` : installCommand;

  return {
    repoCommand,
    installCommand,
    fullSnippet
  };
}
