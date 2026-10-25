import type { WshItemError, WshItemTone, WshObservation } from './wshMonitorTypes';

/**
 * Leitura pura da OBSERVACAO da PCINTEGRACAOCORE: a resposta do PDVSync que o WSH grava depois do envio.
 * Formatos vistos no ambiente real:
 *   `[200 OK] {"success":true,...}`, `{"success":false,"errors":{"5":{"impostos":["..."],"identificadorExterno":["270-270"]}}}`
 *   e o toString de mapa Java `{success=true, message=null, ..., totalTime=81.0, numberOfRecords=14.0}`.
 * O texto pode vir cortado (o Hub lê até 3800 caracteres), então os erros são extraídos por varredura, não por JSON.parse.
 */

const HTTP_PREFIX = /^\s*\[(\d{3})[^\]]*\]\s*/;
const NUMBER_FIELD = (name: string) => new RegExp(`"?${name}"?\\s*[:=]\\s*(-?\\d+(?:\\.\\d+)?)`);
const SUCCESS_FIELD = /"?success"?\s*[:=]\s*(true|false)/i;
/** Início de cada item da lista de erros: `"5":{`. */
const ERROR_ENTRY = /"(\d+)"\s*:\s*\{/g;
/** Um campo do erro: `"impostos":["msg1","msg2"]` (o último pode estar cortado). */
const ERROR_FIELD = /"([A-Za-z_][\w]*)"\s*:\s*\[([^\]]*)\]?/g;
const QUOTED = /"((?:[^"\\]|\\.)*)"/g;

const unescape = (value: string) => value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

function parseErrors(text: string): WshItemError[] {
  const start = text.search(/"errors"\s*:\s*\{/);
  if (start < 0) return [];
  const body = text.slice(start);
  const entries = [...body.matchAll(ERROR_ENTRY)];
  const errors: WshItemError[] = [];
  entries.forEach((entry, index) => {
    const chunk = body.slice(entry.index! + entry[0].length, entries[index + 1]?.index ?? body.length);
    let externalId: string | undefined;
    const fields: { field: string; messages: string[] }[] = [];
    for (const match of chunk.matchAll(ERROR_FIELD)) {
      const values = [...match[2].matchAll(QUOTED)].map((value) => unescape(value[1]));
      if (match[1] === 'identificadorExterno') externalId = values[0];
      else if (match[1] !== 'linkDocumentacao' && values.length > 0) fields.push({ field: match[1], messages: values });
    }
    fields.forEach((field) => errors.push({ externalId, ...field }));
  });
  return errors;
}

export function parseObservation(raw: string | null | undefined, fullLength?: number): WshObservation | undefined {
  if (!raw || !raw.trim()) return undefined;
  const http = raw.match(HTTP_PREFIX);
  const text = http ? raw.slice(http[0].length) : raw;
  const success = text.match(SUCCESS_FIELD);
  const totalTime = text.match(NUMBER_FIELD('totalTime'));
  const records = text.match(NUMBER_FIELD('numberOfRecords'));
  return {
    ...(http ? { httpStatus: Number(http[1]) } : {}),
    ...(success ? { success: success[1].toLowerCase() === 'true' } : {}),
    errors: parseErrors(text),
    ...(totalTime ? { totalTimeMs: Math.round(Number(totalTime[1])) } : {}),
    ...(records ? { records: Math.round(Number(records[1])) } : {}),
    raw,
    truncated: fullLength !== undefined && fullLength > raw.length
  };
}

/**
 * Separa os erros que citam este item dos de outros itens do mesmo envio. O IDEXTERNO do WSH carrega o
 * identificador que o PDVSync devolve (`pdvsync-produto-270-270-1-...` ↔ `270-270`; `pdvsync-cobranca-PIXs-...` ↔ `PIXS`).
 */
export function splitErrorsByItem(itemExternalId: string, errors: WshItemError[]): { own: WshItemError[]; others: WshItemError[] } {
  const haystack = `${itemExternalId.toLowerCase()}-`;
  const isOwn = (error: WshItemError) => Boolean(error.externalId) && haystack.includes(`-${error.externalId!.toLowerCase()}-`);
  return { own: errors.filter(isOwn), others: errors.filter((error) => !isOwn(error)) };
}

/** STATUS da PCINTEGRACAOCORE. Só 2 e 3 foram confirmados no ambiente real; o resto aparece pelo código. */
export function describeWshStatus(status: string | null | undefined): { label: string; tone: WshItemTone } {
  const code = String(status ?? '').trim();
  if (code === '2') return { label: 'Integrado', tone: 'ok' };
  if (code === '3') return { label: 'Erro', tone: 'error' };
  return { label: code ? `Status ${code}` : 'Sem status', tone: 'other' };
}

/** Uma linha curta do erro, para listas e para o Jira: "270-270 · impostos: O campo não pode ser nulo ou vazio". */
export function formatWshError(error: WshItemError): string {
  return `${error.externalId ? `${error.externalId} · ` : ''}${error.field}: ${error.messages.join('; ')}`;
}
