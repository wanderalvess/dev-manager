/**
 * O motivo que o WTA grava no lugar do JSON quando recusa um pedido online (STATUS = R na PCLOGPEDIDOAPI). Formatos
 * vistos num banco real (2026-10-29):
 * - "(WT-IM-0000239) -> Pedido HUB ou Market Place já incluído.  { [] }": código, mensagem e o detalhe entre "{ [ ] }",
 *   que pode trazer outro TotvsError dentro; o código também aparece sem número ("WPV-PDVSYNC");
 * - "TotvsError[code=WT-IM-000294, message='Pedido já Faturado', detailedMessage='...', helpUrl='null', details=[]]";
 * - "PreparedStatementCallback; bad SQL grammar [INSERT INTO PCNFCANITEM ...]; nested exception is ...: ORA-00904: ...":
 *   erro de SQL do próprio WTA; o que interessa é a tabela e o ORA do fim;
 * - texto simples ("O orçamento 1001971 já foi cancelado anteriormente.").
 */

export interface OrderRejection {
  /** Código da mensagem do WinThor ("WT-IM-0000239", "WPV-PDVSYNC") ou o ORA de um erro de SQL. */
  code?: string;
  message: string;
  /** O detalhe que vem junto: o "{ [ ... ] }", o detailedMessage do TotvsError ou a tabela do SQL. */
  detail?: string;
}

const clean = (text: string | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** TotvsError[code=..., message='...', detailedMessage='...'] → código, mensagem e detalhe. */
function parseTotvsError(text: string): OrderRejection | undefined {
  const code = /code=([A-Z0-9-]+)/.exec(text)?.[1];
  const message = /message='([\s\S]*?)'(?=,\s*detailedMessage=|,\s*helpUrl=|\])/.exec(text)?.[1];
  if (!code && !message) return undefined;
  const detail = clean(/detailedMessage='([\s\S]*?)'(?=,\s*helpUrl=|,\s*details=|\])/.exec(text)?.[1]);
  return { ...(code ? { code } : {}), message: clean(message) || code || 'Erro do WinThor', ...(detail && detail !== clean(message) ? { detail } : {}) };
}

function parseSqlCallback(text: string): OrderRejection {
  const table = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|FROM)\s+([A-Z0-9_$#.]+)/i.exec(text)?.[1]?.toUpperCase();
  const ora = /(ORA-\d{5}):?\s*([^\n\]]*)/.exec(text);
  const message = ora ? clean(`${ora[1]}: ${ora[2]}`) : 'Erro de SQL no WTA';
  return {
    ...(ora ? { code: ora[1] } : {}),
    message: table ? `Erro de SQL no WTA ao gravar ${table} (${message})` : message,
    ...(ora?.[1] === 'ORA-00904' ? { detail: 'Coluna que o WTA espera não existe neste banco: o banco está mais antigo que a versão do WTA.' } : {})
  };
}

export function parseOrderRejection(text: string | undefined): OrderRejection | undefined {
  const raw = (text ?? '').trim();
  if (!raw || raw.startsWith('{') || raw.startsWith('[')) return undefined;
  if (/^TotvsError\[/.test(raw)) return parseTotvsError(raw) ?? { message: clean(raw) };
  if (/^PreparedStatementCallback/.test(raw)) return parseSqlCallback(raw);
  const coded = /^\(\s*([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\s*\)\s*(?:->)?\s*([\s\S]*)$/.exec(raw);
  if (!coded) return { message: clean(raw) };
  const body = coded[2];
  const braces = /\{\s*\[([\s\S]*)\]\s*\}\s*$/.exec(body);
  const message = clean(braces ? body.slice(0, braces.index) : body);
  const inner = braces ? braces[1].trim() : '';
  const nested = /^TotvsError\[/.test(inner) ? parseTotvsError(inner) : undefined;
  const detail = nested ? clean([nested.message, nested.detail].filter(Boolean).join(': ')) : clean(inner);
  return { code: coded[1], message: message || coded[1], ...(detail ? { detail } : {}) };
}
