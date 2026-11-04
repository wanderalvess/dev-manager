/**
 * Conferência antes de criar uma versão nova (Assistente INFR → Nova versão, passo 4): cada ponto
 * diz se está ok, se merece atenção ou se impede o ambiente de subir, numa frase.
 */
import type { InfrDbMode } from './infrWinthorVersion';
import { winthorLineOf, type InfrManifestSource, type InfrVersionPreview, type ManifestRepoRepair } from './infrVersionManifest';

export type InfrReviewStatus = 'ok' | 'warn' | 'block';

/** Correção que a tela oferece num botão, ao lado do ponto que bloqueia. */
export type InfrReviewFix = 'useSourceOracle' | 'emptyOracle';

export interface InfrReviewItem {
  id: 'origem' | 'versao' | 'features' | 'dependencias' | 'artefatos' | 'ensaio' | 'portas' | 'disco' | 'memoria' | 'rede' | 'wsh' | 'banco' | 'imagem' | 'manifesto' | 'portasfixas' | 'arquivosenv' | 'repositorios' | 'imagemmesma' | 'recriar' | 'jarwsh';
  status: InfrReviewStatus;
  title: string;
  detail: string;
  fixes?: InfrReviewFix[];
}

export interface InfrReviewInput {
  preview: InfrVersionPreview;
  manifestSource: InfrManifestSource;
  version: string;
  from: string;
  dbMode: InfrDbMode;
  dbSource?: string;
  /** Imagem do Oracle de onde o banco seria clonado (docker ps) */
  dbSourceImage?: string;
  dbContainer?: string;
  wshJar?: string;
}

/** O clone por RMAN do INFR-Docker (bkp_rman.sh/restore_rman.sh) é feito para a imagem oracle-winthor (XE 11g). */
export const isInfrXeImage = (image: string) => /^oracle-winthor(:|$)/.test(image.trim());

export function reviewNewVersion(i: InfrReviewInput): InfrReviewItem[] {
  const p = i.preview;
  if (!p.success) return [{ id: 'origem', status: 'block', title: 'Não foi possível ler a origem', detail: p.error || 'Erro desconhecido.' }];
  const up = p.upgrade ?? { changes: [], behind: [], skipped: [] };
  const items: InfrReviewItem[] = [
    {
      id: 'origem',
      status: 'ok',
      title: 'Login e catálogo da 801',
      detail: `Lido de ${p.originWtaUrl}: ${up.changes.length} sobem, ${up.behind.length} ficam na versão anterior, ${up.skipped.length} ignoradas.`
    }
  ];

  const existing = p.existing;
  const useExisting = !!existing && i.manifestSource === 'existing';
  const from = downgradeFrom(i);
  if (from !== undefined) {
    items.push({
      id: 'versao',
      status: 'warn',
      title: `Downgrade: a origem está na ${from}`,
      detail: `O ${i.from} está na linha ${from} e a versão nova é a ${i.version}. A Nova versão só sobe features; para descer, o ambiente precisa da lista da ${i.version}. Sem ela, use Montar do zero com um dump da ${i.version}.`
    });
  }
  if (from !== undefined && !useExisting) {
    items.push({
      id: 'features',
      status: 'block',
      title: `Features da ${i.version}`,
      detail: existing
        ? `Use a lista que já existe (versions/${i.version}.features): a lista nova manteria as features da ${from} num ambiente ${i.version}.`
        : `Não há versions/${i.version}.features no INFR-Docker, e a lista nova manteria as features da ${from} num ambiente ${i.version}. Gere a lista de um WTA ${i.version} (export_features.sh) ou use Montar do zero.`
    });
  } else if (useExisting) {
    items.push({ id: 'features', status: 'ok', title: `Features da ${i.version}`, detail: `Usa a lista que já existe (${existing.count} features); ${existing.repairText ? 'só as versões sem repositório são trocadas.' : 'nada é regravado.'}` });
  } else if (existing && existing.comparison.older > 0) {
    items.push({
      id: 'features',
      status: 'warn',
      title: `Features da ${i.version}`,
      detail: `Substituir a lista existente rebaixaria ${existing.comparison.older} features: o catálogo deste WTA não tem a linha ${i.version} delas.`
    });
  } else if (up.behind.length > 0) {
    items.push({
      id: 'features',
      status: 'warn',
      title: `Features da ${i.version}`,
      detail: `${up.behind.length} features sem versão da linha ${i.version} no catálogo ficam como na origem.${behindAdvice(i, p)}`
    });
  } else {
    items.push({ id: 'features', status: 'ok', title: `Features da ${i.version}`, detail: `${up.changes.length} sobem pelo catálogo da 801.` });
  }

  const coverage = reviewRepoCoverage(useExisting ? existing.repair : p.repair, i.version, useExisting);
  if (coverage) items.push(coverage);

  if (!useExisting) {
    items.push(reviewDependencies(p.dependencies));
    const artifacts = reviewArtifacts(p.artifacts);
    if (artifacts) items.push(artifacts);
    if (p.dryRun) items.push(reviewDryRun(p.dryRun));
  }
  items.push(...(p.preflight ?? []));

  const checks = useExisting && existing.wshCheck ? existing.wshCheck : p.wshCheck;
  const fails = checks?.filter((c) => !c.ok) ?? [];
  if (!i.wshJar) {
    items.push({ id: 'wsh', status: 'warn', title: 'Sem WSH', detail: 'O ambiente sobe sem WSH; dá para criar depois no passo WSH.' });
  } else if (p.wshError) {
    items.push({ id: 'wsh', status: 'warn', title: 'WSH não conferido', detail: p.wshError });
  } else if (fails.length) {
    items.push({
      id: 'wsh',
      status: 'block',
      title: 'O WSH recusaria subir',
      detail: fails.map((c) => `${c.service} exige ${c.version} ou acima e terá ${c.found ?? 'nenhuma'}`).join('; ') + '.'
    });
  } else {
    items.push({
      id: 'wsh',
      status: 'ok',
      title: 'WSH',
      detail: (checks ?? []).map((c) => `${c.service} exige ${c.version} ou acima; terá ${c.found}`).join('; ') || 'O jar não cobra versão de nenhuma feature.'
    });
  }

  items.push(reviewDatabase(i));
  return items;
}

/**
 * Cada feature da lista está num repositório dela? É o que o build confere primeiro ("Feature X/versão não existe em
 * nenhum repositório da lista"); aqui sai dos features.xml baixados na leitura. Sem conferência (algum XML não veio), nada.
 */
function reviewRepoCoverage(r: ManifestRepoRepair | undefined, version: string, existing: boolean): InfrReviewItem | null {
  if (!r) return null;
  const file = `versions/${version}.features`;
  const names = (xs: { name: string; version: string }[]) => (xs.length > 3 ? `${xs.slice(0, 3).map((x) => `${x.name} ${x.version}`).join(', ')} e mais ${xs.length - 3}` : xs.map((x) => `${x.name} ${x.version}`).join(', '));
  if (r.unresolved.length > 0) {
    return {
      id: 'repositorios',
      status: 'block',
      title: 'Feature sem repositório na lista',
      detail:
        `${names(r.unresolved)}: nenhum "repo mvn:" da lista tem essa feature, em nenhuma versão, e o build pararia em "não existe em nenhum repositório da lista". ` +
        `Como resolver: acrescente em ${file} a linha "repo mvn:<grupo>/<artefato>/<versão>/xml/features" do Nexus que tem a feature, ou tire a feature da lista, e confira de novo.`
    };
  }
  if (r.repairs.length > 0) {
    const list = r.repairs.map((c) => `${c.name} ${c.from} → ${c.to}`);
    return {
      id: 'repositorios',
      status: 'warn',
      title: existing ? `A lista da ${version} é corrigida ao criar` : 'Lista corrigida pelos repositórios',
      detail:
        `${list.length > 3 ? `${list.slice(0, 3).join(', ')} e mais ${list.length - 3}` : list.join(', ')}: a versão pedida não está em nenhum repositório da lista, e o build pararia nela. ` +
        `${existing ? `A criação regrava ${file} com a versão que os repositórios têm.` : 'A lista nova já sai com a versão que os repositórios têm.'} Para manter a mais nova, acrescente o "repo mvn:" dela na lista.`
    };
  }
  return { id: 'repositorios', status: 'ok', title: 'Repositório de cada feature', detail: 'Toda feature da lista está num repositório dela (conferido nos features.xml do Nexus).' };
}

/** O Karaf de origem simulou a instalação das features trocadas? Só avisa: ele ainda tem o estado da versão antiga. */
function reviewDryRun(d: NonNullable<InfrVersionPreview['dryRun']>): InfrReviewItem {
  const title = 'Ensaio da resolução no Karaf';
  if (d.skipped) return { id: 'ensaio', status: 'warn', title: 'Ensaio da resolução não rodou', detail: `${d.skipped}.` };
  if (d.errors.length) {
    return {
      id: 'ensaio',
      status: 'warn',
      title: 'O Karaf não resolveu as features',
      detail: `${d.errors.slice(0, 3).join(' · ')}${d.errors.length > 3 ? ` · e mais ${d.errors.length - 3}` : ''}. O build tende a falhar do mesmo jeito.`
    };
  }
  return { id: 'ensaio', status: 'ok', title, detail: `${d.simulated} features simuladas (feature:install -t) sem erro de resolução.` };
}

/** Os repositórios novos existem no Nexus do WTA? Só avisa: o teste pode não enxergar um espelho ou um login. */
function reviewArtifacts(a: InfrVersionPreview['artifacts']): InfrReviewItem | null {
  if (!a || (a.checked === 0 && a.withoutRepo.length === 0)) return null;
  const title = 'Artefatos no Nexus';
  const extra = a.withoutRepo.length ? ` ${a.withoutRepo.length} features trocadas não trouxeram repositório próprio (${a.withoutRepo.slice(0, 3).join(', ')}${a.withoutRepo.length > 3 ? '…' : ''}); confira que o Karaf as acha.` : '';
  if (a.missing.length > 0) {
    const list = a.missing.length > 3 ? `${a.missing.slice(0, 3).join(', ')} e mais ${a.missing.length - 3}` : a.missing.join(', ');
    return {
      id: 'artefatos',
      status: 'warn',
      title: 'Repositório que o Nexus não tem',
      detail: `${a.missing.length} de ${a.checked} repositórios da lista não existem em nenhum repositório do Karaf (${list}). O build provavelmente termina em "Unable to resolve".${extra}`
    };
  }
  if (a.unverified > 0) {
    return { id: 'artefatos', status: 'warn', title: 'Artefatos não conferidos', detail: `Não deu para testar ${a.unverified} de ${a.checked} repositórios no Nexus${a.error ? ` (${a.error})` : ' (sem resposta ou pedindo login)'}.${extra}` };
  }
  return { id: 'artefatos', status: a.withoutRepo.length ? 'warn' : 'ok', title, detail: `${a.checked} repositórios novos encontrados no Nexus.${extra}` };
}

/**
 * Dependências das features contra o que o catálogo da 801 declara e contra os features.xml dos repositórios do Nexus.
 * As duas fontes só veem dependência entre FEATURES; conflito de pacote entre bundles só aparece no ensaio no Karaf.
 */
function reviewDependencies(d: InfrVersionPreview['dependencies']): InfrReviewItem {
  const title = 'Dependências das features';
  const xml = d?.xml;
  const BUNDLES = ' Conflito de pacote entre bundles (osgi.wiring.package) não aparece aqui: só o ensaio no Karaf de origem o mostra antes do build.';
  if (!d || d.withDependencies === 0) {
    const xmlNote = xml
      ? xml.error
        ? ` Os features.xml do Nexus também não foram conferidos (${xml.error}).`
        : ` Os features.xml do Nexus (${xml.fetched} de ${xml.repos} baixados, ${xml.checked} features achadas) também não declaram dependências entre elas.`
      : '';
    return {
      id: 'dependencias',
      status: 'warn',
      title,
      detail: d
        ? `O catálogo da 801 não trouxe dependências em nenhuma das ${d.checked} features conferidas.${xmlNote} Não deu para conferir antes do build; se ele falhar em "Unable to resolve", é isso.${BUNDLES}`
        : 'Não deu para conferir as dependências antes do build.'
    };
  }
  const conflicts = d.issues.filter((x) => x.kind === 'conflict');
  const describe = (x: (typeof d.issues)[number]) =>
    x.kind === 'conflict'
      ? `${x.feature} ${x.version} exige ${x.dependency} ${x.required} e a lista tem ${x.found}${x.fix || x.source === 'xml' ? '' : ' (o catálogo não oferece a versão exigida)'}`
      : `${x.feature} ${x.version} exige ${x.dependency} ${x.required}, que o catálogo não oferece`;
  const list = (xs: string[]) => (xs.length > 5 ? `${xs.slice(0, 5).join('; ')}; e mais ${xs.length - 5}` : xs.join('; '));
  if (conflicts.length > 0) {
    const fromXml = conflicts.some((x) => x.source === 'xml');
    return {
      id: 'dependencias',
      status: 'block',
      title: 'Dependências que não fecham',
      detail: `${list(conflicts.map(describe))}. O build falharia ao resolver as features.${fromXml ? ' Saída provável: pôr na lista a versão que atende à faixa, ou voltar a feature que exige para a versão da origem.' : ''}`
    };
  }
  if (d.issues.length > 0) {
    return { id: 'dependencias', status: 'warn', title, detail: `${list(d.issues.map(describe))}.` };
  }
  const xmlOk = xml && !xml.error && xml.withDependencies > 0 ? ` ${xml.withDependencies} conferidas pelos features.xml do Nexus (${xml.fetched} repositórios).` : '';
  return {
    id: 'dependencias',
    status: 'ok',
    title,
    detail: `${d.fixed > 0 ? `${d.fixed} ajustadas pelo catálogo para atender às dependências; as demais já fecham.` : `${d.withDependencies} features com dependências, todas atendidas pela lista.`}${xmlOk}${xmlOk ? BUNDLES : ''}`
  };
}

/**
 * As features que ficam na versão anterior convivem com as que sobem; quando uma exige de outra uma faixa que a lista nova
 * não atende, o build só descobre isso depois de ~30 minutos. Ficar para trás é comum (muitas features passam anos na mesma
 * linha), então isto não bloqueia: cita as mais atrasadas e, se nenhuma conferência olhou o conflito, sugere o ensaio no Karaf.
 */
function behindAdvice(i: InfrReviewInput, p: InfrVersionPreview): string {
  const target = parseInt(i.version, 10);
  const far = (p.upgrade?.behind ?? [])
    .map((f) => ({ f, line: winthorLineOf(f.version) }))
    .filter((x): x is { f: (typeof x)['f']; line: number } => x.line !== undefined && target - x.line >= 2)
    .sort((a, b) => a.line - b.line);
  const worst = far.slice(0, 3).map((x) => `${x.f.name} ${x.f.version}`);
  const farText = far.length > 0 ? ` ${far.length} delas estão 2 ou mais linhas atrás (${worst.join(', ')}${far.length > 3 ? ' e mais' : ''}).` : '';
  const conferred = !!p.dryRun || (!!p.dependencies && p.dependencies.withDependencies > 0);
  const advice = conferred ? '' : ' O conflito entre elas e as que sobem só aparece no build; ligue o ensaio no Karaf de origem (Ajustes → Avançado) para ver antes.';
  return `${farText}${advice}`;
}

/** Linha da origem quando ela é maior que a versão nova (downgrade); senão, undefined. */
function downgradeFrom(i: InfrReviewInput): number | undefined {
  const line = i.preview.originLine;
  const target = parseInt(i.version, 10);
  return line !== undefined && Number.isFinite(target) && target < line ? line : undefined;
}

export function reviewDatabase(i: InfrReviewInput): InfrReviewItem {
  const title = 'Banco do ambiente novo';
  const from = downgradeFrom(i);
  // Banco de uma versão mais nova: os scripts da Central só sobem, e coluna a mais não atrapalha o WTA mais antigo.
  // Só avisa; o risco é a linha nova ter tirado algo que uma rotina antiga usa, e isso só aparece usando.
  if (from !== undefined && (i.dbMode === 'clone' || i.dbContainer === `oracle-${i.from}`)) {
    return {
      id: 'banco',
      status: 'warn',
      title: `O banco vem da ${from}`,
      detail: `${i.dbMode === 'clone' ? `O clone do ${i.dbSource}` : `O ${i.dbContainer}`} traz as tabelas da ${from}; o WTA ${i.version} roda em cima delas. Se alguma rotina der erro de coluna ou tabela, use um Oracle vazio com um dump da ${i.version}.`,
      fixes: ['emptyOracle']
    };
  }
  if (from !== undefined && i.dbMode === 'existing') {
    return { id: 'banco', status: 'warn', title, detail: `Usa o ${i.dbContainer}: confira que ele tem um banco da ${i.version}, não da ${from}.` };
  }
  if (i.dbMode === 'clone') {
    if (i.dbSourceImage && !isInfrXeImage(i.dbSourceImage)) {
      return {
        id: 'banco',
        status: 'block',
        title: 'O clone do banco não funciona com este Oracle',
        detail: `${i.dbSource} usa a imagem ${i.dbSourceImage}; o clone por RMAN do INFR-Docker é para o Oracle XE 11g (oracle-winthor).`,
        fixes: ['useSourceOracle', 'emptyOracle']
      };
    }
    return { id: 'banco', status: 'ok', title, detail: `Cópia do ${i.dbSource} (RMAN) num ${i.dbContainer} novo.` };
  }
  if (i.dbMode === 'existing') {
    const shared = i.dbContainer === `oracle-${i.from}`;
    return shared
      ? { id: 'banco', status: 'warn', title, detail: `Usa o mesmo banco da origem (${i.dbContainer}): o WTA da versão nova pode alterar as tabelas dele.` }
      : { id: 'banco', status: 'ok', title, detail: `Usa o ${i.dbContainer}, que já existe.` };
  }
  return { id: 'banco', status: 'warn', title, detail: `${i.dbContainer} sobe vazio: importe o dump da versão antes de usar o WTA.` };
}

/** Algum ponto impede de criar. */
export const reviewBlocks = (items: InfrReviewItem[]) => items.some((it) => it.status === 'block');
