import {
  Routine801CatalogResponse,
  Routine801Feature,
  Routine801Repository,
  Routine801RepositoryUpdate,
  Routine801Status
} from '../../shared/types';

/**
 * Constrói a URL Maven para o repositório de features do Apache Karaf.
 */
export function buildFeatureMavenUrl(groupId: string, artifactId: string, version: string): string {
  return `mvn:${groupId}/${artifactId}/${version}/xml/features`;
}

/**
 * Normaliza e valida a resposta bruta dos endpoints da Rotina 801 (/instalacao e /atualizacao).
 */
export function normalizeRoutine801Catalog(data: any): Routine801CatalogResponse {
  if (!data || typeof data !== 'object') {
    return { repositorios: [], funcionalidades: [] };
  }

  const rawRepos: any[] = Array.isArray(data.repositorios) ? data.repositorios : [];
  const rawFuncs: any[] = Array.isArray(data.funcionalidades) ? data.funcionalidades : [];

  const repositorios: Routine801RepositoryUpdate[] = rawRepos.map((item) => {
    const rawRepo = item.repositorio || item;
    const groupId = String(rawRepo.groupId || '').trim();
    const artifactId = String(rawRepo.artifactId || '').trim();
    const version = String(rawRepo.version || rawRepo.versao || '').trim();
    const featureMavenUrl =
      rawRepo.featureMavenUrl || (groupId && artifactId && version ? buildFeatureMavenUrl(groupId, artifactId, version) : undefined);

    return {
      comando: String(item.comando || 'INSTALL').toUpperCase(),
      repositorio: {
        groupId,
        artifactId,
        version,
        featureMavenUrl
      }
    };
  });

  const funcionalidades: Routine801Feature[] = rawFuncs.map((item) => {
    // A API da TOTVS às vezes aninha os dados em `item.funcionalidade` ou direto no item
    const rawFunc = item.funcionalidade && typeof item.funcionalidade === 'object' ? item.funcionalidade : item;
    const rawAnt = item.funcionalidadeAnterior;

    const nome = String(rawFunc.nome || rawFunc.funcionalidade || item.nome || item.funcionalidade || '').trim();
    const versao = String(rawFunc.versao || item.versao || '').trim();
    const versaoAnterior = rawAnt?.versao ? String(rawAnt.versao).trim() : (item.versaoAnterior ? String(item.versaoAnterior).trim() : undefined);
    const codigoRotina = Number(item.codigoRotina ?? rawFunc.codigoRotina ?? 0);
    const codigoModulo = Number(item.codigoModulo ?? rawFunc.codigoModulo ?? 0);
    const tipoProjeto = String(item.tipoProjeto || rawFunc.tipoProjeto || (codigoRotina > 0 ? 'ROTINA' : 'SERVICO')).toUpperCase();
    const descricao = String(item.descricao || rawFunc.descricao || nome).trim();
    const rawStatus = String(item.status || rawFunc.status || 'LIBERADO').toUpperCase() as Routine801Status;
    const comando = String(item.comando || (versaoAnterior ? 'UPDATE' : 'INSTALL')).toUpperCase();

    // Tenta encontrar o repositório maven associado
    const matchedRepo = findRepositoryForFeature({ nome, versao }, repositorios);

    return {
      nome,
      versao,
      versaoAnterior,
      comando,
      codigoRotina,
      codigoModulo,
      tipoProjeto,
      descricao,
      status: rawStatus,
      dependencias: Array.isArray(rawFunc.dependencias || item.dependencias)
        ? (rawFunc.dependencias || item.dependencias).map((d: any) => ({
            featureName: d.featureName || d.nome,
            version: d.version || d.versao,
            type: d.type || d.tipo
          }))
        : [],
      featureMavenUrl: matchedRepo?.featureMavenUrl
    };
  });

  return {
    repositorios,
    funcionalidades
  };
}

/**
 * Localiza o repositório Maven correspondente a uma funcionalidade na lista de repositórios.
 */
export function findRepositoryForFeature(
  feature: Pick<Routine801Feature, 'nome' | 'versao'>,
  repositorios: Routine801RepositoryUpdate[]
): Routine801Repository | null {
  if (!feature.nome || !repositorios.length) return null;

  const cleanName = feature.nome.toLowerCase().trim();

  // 1. Correspondência exata ou sufixos comuns (-features, -feature)
  for (const item of repositorios) {
    const art = item.repositorio.artifactId.toLowerCase().trim();
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

  // 2. Correspondência por contenção (se a versão coincidir ou se o nome fizer parte do artifactId)
  for (const item of repositorios) {
    const art = item.repositorio.artifactId.toLowerCase().trim();
    if (art.includes(cleanName) || cleanName.includes(art)) {
      if (!feature.versao || item.repositorio.version === feature.versao) {
        return item.repositorio;
      }
    }
  }

  // 3. Fallback: primeira correspondência parcial
  for (const item of repositorios) {
    const art = item.repositorio.artifactId.toLowerCase().trim();
    if (art.includes(cleanName) || cleanName.includes(art)) {
      return item.repositorio;
    }
  }

  return null;
}

/**
 * Filtra funcionalidades da Rotina 801 com base em consulta textual, filtro de tipo e filtro de status.
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
    // Filtro de tipo
    if (normalizedType !== 'ALL') {
      const featType = (feat.tipoProjeto || '').toUpperCase();
      if (featType !== normalizedType) return false;
    }

    // Filtro de status (P / LIBERADO, H / HOMOLOGACAO, etc.)
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

    // Filtro por texto
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
 * Gera os comandos de console Karaf necessários para adicionar o repositório e instalar a feature.
 */
export function buildKarafInstallCommands(
  feature: Routine801Feature,
  repo?: Routine801Repository | null
): { repoCommand?: string; installCommand: string } {
  let repoCommand: string | undefined;

  const targetMavenUrl = repo?.featureMavenUrl || feature.featureMavenUrl;
  if (targetMavenUrl) {
    repoCommand = `feature:repo-add ${targetMavenUrl}`;
  }

  const featureTarget = feature.versao ? `${feature.nome}/${feature.versao}` : feature.nome;
  const installCommand = `feature:install -r -u ${featureTarget}`;

  return {
    repoCommand,
    installCommand
  };
}
