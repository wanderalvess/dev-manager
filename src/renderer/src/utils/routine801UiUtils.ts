import { Routine801Feature, Routine801Repository, Routine801RepositoryUpdate } from '../../../shared/types';

/**
 * Filtra funcionalidades da Rotina 801 com base em busca textual, tipo de projeto e status.
 */
export function filterRoutine801Features(
  features: Routine801Feature[],
  search: string,
  typeFilter: string = 'ALL',
  statusFilter: string = 'ALL'
): Routine801Feature[] {
  const query = (search || '').toLowerCase().trim();
  const normalizedType = (typeFilter || 'ALL').toUpperCase();
  const normalizedStatus = (statusFilter || 'ALL').toUpperCase();

  return features.filter((feat) => {
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
  repo?: Routine801Repository | null
): { repoCommand?: string; installCommand: string; fullSnippet: string } {
  let repoCommand: string | undefined;

  const targetMavenUrl =
    repo?.featureMavenUrl ||
    feature.featureMavenUrl ||
    (repo?.groupId && repo?.artifactId && repo?.version
      ? `mvn:${repo.groupId}/${repo.artifactId}/${repo.version}/xml/features`
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
