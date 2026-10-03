import { QaCorePayloadItem, QaCoreSearchFilter } from '../../shared/types';

/**
 * Constrói a consulta SQL e parâmetros de bind para localizar mensagens
 * na tabela PCINTEGRACAOCORE no banco de dados Oracle.
 */
export function buildCoreSearchSql(filter: QaCoreSearchFilter): {
  sql: string;
  binds: Record<string, any>;
} {
  const limit = Math.min(Math.max(1, filter.limit || 15), 50);
  const binds: Record<string, any> = { pLimit: limit };

  const whereConditions: string[] = ['DADOSTRANSFORMADOS IS NOT NULL'];

  if (filter.mode === 'cgcEnt' && filter.cgcEnt) {
    const cleanCgc = String(filter.cgcEnt).replace(/[^0-9]/g, '');
    binds.pCgc = `%"cgcEnt": "${cleanCgc}"%`;
    whereConditions.push('DADOSTRANSFORMADOS LIKE :pCgc');
  } else if (filter.mode === 'cupom' && filter.numCupom) {
    const cupom = String(filter.numCupom).trim();
    binds.pCupomStr = `%"numCupom": "${cupom}"%`;
    binds.pCupomNum = `%"numCupom": ${cupom}%`;
    whereConditions.push('(DADOSTRANSFORMADOS LIKE :pCupomStr OR DADOSTRANSFORMADOS LIKE :pCupomNum)');

    if (filter.codFilial) {
      const fil = String(filter.codFilial).trim();
      binds.pFilialStr = `%"codFilial": "${fil}"%`;
      binds.pFilialNum = `%"codFilial": ${fil}%`;
      whereConditions.push('(DADOSTRANSFORMADOS LIKE :pFilialStr OR DADOSTRANSFORMADOS LIKE :pFilialNum)');
    }
  } else if (filter.mode === 'chave' && filter.chaveNfe) {
    const chave = String(filter.chaveNfe).trim();
    binds.pChaveNfce = `%"chaveNfce": "${chave}"%`;
    binds.pChaveNfe = `%"chaveNfe": "${chave}"%`;
    whereConditions.push('(DADOSTRANSFORMADOS LIKE :pChaveNfce OR DADOSTRANSFORMADOS LIKE :pChaveNfe)');
  } else if (filter.mode === 'idExterno' && filter.idExterno) {
    const id = String(filter.idExterno).trim();
    binds.pIdExt = `%"idExterno": "${id}"%`;
    binds.pIdInt = `%"idInterno": "${id}"%`;
    whereConditions.push('(DADOSTRANSFORMADOS LIKE :pIdExt OR DADOSTRANSFORMADOS LIKE :pIdInt)');
  }

  const whereClause = whereConditions.join(' AND ');

  // Busca interna com ordenação por ROWID DESC para pegar transações mais recentes
  const sql = `
    SELECT DADOSTRANSFORMADOS, ROWID AS ROW_ID
    FROM (
      SELECT DADOSTRANSFORMADOS, ROWID
      FROM PCINTEGRACAOCORE
      WHERE ${whereClause}
      ORDER BY ROWID DESC
    )
    WHERE ROWNUM <= :pLimit
  `.trim();

  return { sql, binds };
}

/**
 * Normaliza e converte o conteúdo de um campo CLOB/Texto em string JSON limpa.
 */
export function extractRawJsonString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (Buffer.isBuffer(value)) return value.toString('utf-8').trim();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value).trim();
}

/**
 * Realiza o parse do JSON presente em DADOSTRANSFORMADOS e extrai
 * metadados resumidos (cupom, filial, cliente, chave, total) para a UI.
 */
export function parseCoreJsonItem(rawText: any, rowId?: string): QaCorePayloadItem | null {
  const jsonStr = extractRawJsonString(rawText);
  if (!jsonStr || (!jsonStr.startsWith('{') && !jsonStr.startsWith('['))) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    const formattedJson = JSON.stringify(parsed, null, 2);

    const numCupom =
      parsed.numCupom !== undefined
        ? String(parsed.numCupom)
        : parsed.consumidorFinal?.numCupom !== undefined
          ? String(parsed.consumidorFinal.numCupom)
          : parsed.documentoEletronico?.numCupom !== undefined
            ? String(parsed.documentoEletronico.numCupom)
            : undefined;

    const codFilial =
      parsed.codFilial !== undefined
        ? String(parsed.codFilial)
        : parsed.consumidorFinal?.codFilial !== undefined
          ? String(parsed.consumidorFinal.codFilial)
          : undefined;

    const cgcEnt =
      parsed.consumidorFinal?.cgcEnt !== undefined
        ? String(parsed.consumidorFinal.cgcEnt)
        : parsed.cgcEnt !== undefined
          ? String(parsed.cgcEnt)
          : undefined;

    const cliente =
      parsed.consumidorFinal?.cliente ||
      parsed.cliente ||
      (cgcEnt ? `Cliente CPF/CNPJ ${cgcEnt}` : undefined);

    const chaveNfe = parsed.chaveNfe || parsed.chaveNfce;
    const pdvOrigem = parsed.pdvOrigem;
    const vlTotal = parsed.vlTotal || parsed.vlTotalComTroco;
    const data = parsed.data || parsed.consumidorFinal?.data;

    return {
      id: rowId || parsed.idExterno || parsed.idInterno || String(Date.now()),
      numCupom,
      codFilial,
      cgcEnt,
      cliente,
      pdvOrigem,
      chaveNfe,
      vlTotal,
      data,
      rawJson: formattedJson
    };
  } catch {
    return null;
  }
}
