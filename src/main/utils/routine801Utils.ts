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
 * Filtra funcionalidades da Rotina 801 com base em consulta textual, filtro de tipo, filtro de status e filtro de versão.
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
 * Suporta fallback com auto-inferência da URL Maven para evitar erros de "No matching features".
 */
export function buildKarafInstallCommands(
  feature: Routine801Feature,
  repo?: Routine801Repository | null,
  autoInferRepo: boolean = true
): { repoCommand?: string; installCommand: string } {
  let repoCommand: string | undefined;

  const targetMavenUrl =
    repo?.featureMavenUrl ||
    feature.featureMavenUrl ||
    (autoInferRepo && feature.nome && feature.versao ? inferFeatureMavenUrl(feature) : undefined);

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
