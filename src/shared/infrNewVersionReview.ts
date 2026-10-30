/**
 * Conferência antes de gerar uma versão nova (Assistente INFR → Nova versão, passo 4): cada ponto
 * diz se está ok, se merece atenção ou se impede o ambiente de subir, numa frase.
 */
import type { InfrDbMode } from './infrWinthorVersion';
import type { InfrManifestSource, InfrVersionPreview } from './infrVersionManifest';

export type InfrReviewStatus = 'ok' | 'warn' | 'block';

/** Correção que a tela oferece num botão, ao lado do ponto que bloqueia. */
export type InfrReviewFix = 'useSourceOracle' | 'emptyOracle';

export interface InfrReviewItem {
  id: 'origem' | 'versao' | 'features' | 'wsh' | 'banco';
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
      detail: `O ${i.from} está na linha ${from} e a versão nova é a ${i.version}. A Nova versão só sobe features; para descer, o ambiente precisa da lista e do banco da ${i.version}. Se não tiver os dois, use Montar do zero com um dump da ${i.version}.`
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
    items.push({ id: 'features', status: 'ok', title: `Features da ${i.version}`, detail: `Usa a lista que já existe (${existing.count} features); nada é regravado.` });
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
      detail: `${up.behind.length} features sem versão da linha ${i.version} no catálogo ficam como na origem.`
    });
  } else {
    items.push({ id: 'features', status: 'ok', title: `Features da ${i.version}`, detail: `${up.changes.length} sobem pelo catálogo da 801.` });
  }

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

/** Linha da origem quando ela é maior que a versão nova (downgrade); senão, undefined. */
function downgradeFrom(i: InfrReviewInput): number | undefined {
  const line = i.preview.originLine;
  const target = parseInt(i.version, 10);
  return line !== undefined && Number.isFinite(target) && target < line ? line : undefined;
}

function reviewDatabase(i: InfrReviewInput): InfrReviewItem {
  const title = 'Banco do ambiente novo';
  const from = downgradeFrom(i);
  // Banco de uma versão mais nova tem colunas e tabelas que o WTA mais antigo não conhece
  if (from !== undefined && (i.dbMode === 'clone' || i.dbContainer === `oracle-${i.from}`)) {
    return {
      id: 'banco',
      status: 'block',
      title: `O banco da ${from} não serve para a ${i.version}`,
      detail: `${i.dbMode === 'clone' ? `O clone do ${i.dbSource}` : `O ${i.dbContainer}`} traz as tabelas da ${from}, e um WTA ${i.version} não roda em cima delas. Suba um Oracle vazio e importe um dump da ${i.version}.`,
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

/** Algum ponto impede de gerar. */
export const reviewBlocks = (items: InfrReviewItem[]) => items.some((it) => it.status === 'block');
