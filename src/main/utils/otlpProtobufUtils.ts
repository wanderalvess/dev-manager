/**
 * Decodificador de baixo nível e alto desempenho para payloads binários OTLP Protobuf (v1/traces).
 * Permite que o Dev Manager APM receba traces nativos enviados pelo OpenTelemetry Java Agent
 * (protocolo padrão `http/protobuf` via Content-Type: `application/x-protobuf`)
 * sem requerer dependências externas pesadas ou compilação nativa.
 *
 * O receptor aceita POST de qualquer processo local (e de páginas web, via CORS), então todo
 * payload é tratado como não confiável: varints, comprimentos e campos de tamanho fixo são
 * validados contra o buffer e qualquer inconsistência lança `OtlpDecodeError` em vez de ser
 * truncada silenciosamente.
 */

export interface OtlpDecodedTracePayload {
  resourceSpans: Array<{
    resource?: {
      attributes?: Record<string, any>;
    };
    scopeSpans?: Array<{
      scope?: {
        name?: string;
        version?: string;
      };
      spans: Array<{
        traceId: string;
        spanId: string;
        parentSpanId?: string;
        name: string;
        kind?: number;
        startTimeUnixNano?: string;
        endTimeUnixNano?: string;
        attributes?: Record<string, any>;
        status?: {
          message?: string;
          code?: number;
        };
        events?: Array<{
          name: string;
          timeUnixNano?: string;
          attributes?: Record<string, any>;
        }>;
      }>;
    }>;
  }>;
}

/**
 * Payload protobuf malformado: varint truncado ou longo demais, campo length-delimited
 * que ultrapassa o buffer, campo de tamanho fixo incompleto ou wire type desconhecido.
 */
export class OtlpDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtlpDecodeError';
  }
}

// Um varint de 64 bits ocupa no máximo 10 bytes; sem esse teto, um payload de bytes 0xFF
// faria a leitura crescer um BigInt a cada byte (custo quadrático, trava o processo).
const MAX_VARINT_BYTES = 10;

// Arrays/kvlists de AnyValue podem se aninhar recursivamente; acima disso o valor é descartado.
const MAX_ANY_VALUE_DEPTH = 16;

/**
 * Lê um varint (base 128) como bigint — necessário para valores int64 (`int_value`).
 */
export function readVarint(buf: Buffer, offset: number): { value: bigint; nextOffset: number } {
  let value = 0n;
  let shift = 0n;
  let pos = offset;
  for (let i = 0; i < MAX_VARINT_BYTES; i++) {
    if (pos >= buf.length) throw new OtlpDecodeError('Varint truncado');
    const b = buf[pos++];
    value |= BigInt(b & 0x7f) << shift;
    if ((b & 0x80) === 0) {
      return { value: BigInt.asUintN(64, value), nextOffset: pos };
    }
    shift += 7n;
  }
  throw new OtlpDecodeError(`Varint excede ${MAX_VARINT_BYTES} bytes`);
}

/**
 * Caminho rápido (sem BigInt) para tags, comprimentos e enums, que sempre cabem em 2^53.
 */
function readVarintNumber(buf: Buffer, offset: number): { value: number; nextOffset: number } {
  let value = 0;
  let multiplier = 1;
  let pos = offset;
  for (let i = 0; i < MAX_VARINT_BYTES; i++) {
    if (pos >= buf.length) throw new OtlpDecodeError('Varint truncado');
    const b = buf[pos++];
    value += (b & 0x7f) * multiplier;
    if ((b & 0x80) === 0) {
      if (!Number.isSafeInteger(value)) throw new OtlpDecodeError('Varint fora do intervalo suportado');
      return { value, nextOffset: pos };
    }
    multiplier *= 128;
  }
  throw new OtlpDecodeError(`Varint excede ${MAX_VARINT_BYTES} bytes`);
}

function readTag(buf: Buffer, offset: number): { fieldNum: number; wireType: number; nextOffset: number } {
  const { value, nextOffset } = readVarintNumber(buf, offset);
  return { fieldNum: Math.floor(value / 8), wireType: value % 8, nextOffset };
}

function skipVarint(buf: Buffer, offset: number): number {
  let pos = offset;
  for (let i = 0; i < MAX_VARINT_BYTES; i++) {
    if (pos >= buf.length) throw new OtlpDecodeError('Varint truncado');
    if ((buf[pos++] & 0x80) === 0) return pos;
  }
  throw new OtlpDecodeError(`Varint excede ${MAX_VARINT_BYTES} bytes`);
}

function ensureAvailable(buf: Buffer, offset: number, size: number): number {
  const end = offset + size;
  if (end > buf.length) throw new OtlpDecodeError(`Campo de ${size} bytes truncado`);
  return end;
}

function readFixed64AsString(buf: Buffer, offset: number): { value: string; nextOffset: number } {
  const nextOffset = ensureAvailable(buf, offset, 8);
  return { value: buf.readBigUInt64LE(offset).toString(), nextOffset };
}

/**
 * Pula um campo com base no seu wire type Protobuf.
 */
export function skipField(buf: Buffer, offset: number, wireType: number): number {
  switch (wireType) {
    case 0: // Varint
      return skipVarint(buf, offset);
    case 1: // 64-bit (fixed64, double)
      return ensureAvailable(buf, offset, 8);
    case 2: // Length-delimited
      return readLengthDelimited(buf, offset).nextOffset;
    case 5: // 32-bit (fixed32, float)
      return ensureAvailable(buf, offset, 4);
    default:
      // Grupos (3/4) não existem no OTLP; qualquer outro valor indica payload corrompido
      throw new OtlpDecodeError(`Wire type protobuf não suportado: ${wireType}`);
  }
}

/**
 * Lê uma fatia delimitada por comprimento (wire type 2).
 */
export function readLengthDelimited(buf: Buffer, offset: number): { slice: Buffer; nextOffset: number } {
  const { value: len, nextOffset } = readVarintNumber(buf, offset);
  const end = nextOffset + len;
  if (end > buf.length) {
    throw new OtlpDecodeError(`Campo length-delimited declara ${len} bytes, mas só restam ${buf.length - nextOffset}`);
  }
  return { slice: buf.subarray(nextOffset, end), nextOffset: end };
}

// Atribuir `__proto__` num objeto literal troca o protótipo dele em vez de criar a chave.
function setDecodedKey(target: Record<string, any>, key: string, value: any): void {
  if (key && key !== '__proto__') target[key] = value;
}

/**
 * Decodifica uma mensagem AnyValue do OpenTelemetry.
 */
export function decodeAnyValue(buf: Buffer, depth = 0): any {
  let pos = 0;
  let result: any = null;
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;

    if (tag.fieldNum === 1 && tag.wireType === 2) {
      // string_value
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      result = slice.toString('utf-8');
    } else if (tag.fieldNum === 2 && tag.wireType === 0) {
      // bool_value
      const { value, nextOffset } = readVarint(buf, pos);
      pos = nextOffset;
      result = value !== 0n;
    } else if (tag.fieldNum === 3 && tag.wireType === 0) {
      // int_value (int64 em complemento de dois: negativos chegam como varint de 10 bytes)
      const { value, nextOffset } = readVarint(buf, pos);
      pos = nextOffset;
      const signed = BigInt.asIntN(64, value);
      const num = Number(signed);
      result = Number.isSafeInteger(num) ? num : signed.toString();
    } else if (tag.fieldNum === 4 && tag.wireType === 1) {
      // double_value
      const nextOffset = ensureAvailable(buf, pos, 8);
      result = buf.readDoubleLE(pos);
      pos = nextOffset;
    } else if (tag.fieldNum === 5 && tag.wireType === 2) {
      // array_value
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      result = depth < MAX_ANY_VALUE_DEPTH ? decodeArrayValue(slice, depth + 1) : null;
    } else if (tag.fieldNum === 6 && tag.wireType === 2) {
      // kvlist_value
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      result = depth < MAX_ANY_VALUE_DEPTH ? decodeKeyValueList(slice, depth + 1) : null;
    } else if (tag.fieldNum === 7 && tag.wireType === 2) {
      // bytes_value
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      result = slice.toString('hex');
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return result;
}

function decodeArrayValue(buf: Buffer, depth: number): any[] {
  let pos = 0;
  const values: any[] = [];
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;
    if (tag.fieldNum === 1 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      values.push(decodeAnyValue(slice, depth));
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return values;
}

export function decodeKeyValue(buf: Buffer, depth = 0): { key: string; value: any } {
  let pos = 0;
  let keyStr = '';
  let val: any = null;
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;
    if (tag.fieldNum === 1 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      keyStr = slice.toString('utf-8');
    } else if (tag.fieldNum === 2 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      val = decodeAnyValue(slice, depth);
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return { key: keyStr, value: val };
}

function decodeKeyValueList(buf: Buffer, depth: number): Record<string, any> {
  let pos = 0;
  const obj: Record<string, any> = {};
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;
    if (tag.fieldNum === 1 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      const kv = decodeKeyValue(slice, depth);
      setDecodedKey(obj, kv.key, kv.value);
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return obj;
}

function decodeStatus(buf: Buffer): { message?: string; code?: number } {
  let pos = 0;
  let message: string | undefined;
  let code: number | undefined;
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;
    if (tag.fieldNum === 2 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      message = slice.toString('utf-8');
    } else if (tag.fieldNum === 3 && tag.wireType === 0) {
      const { value, nextOffset } = readVarintNumber(buf, pos);
      pos = nextOffset;
      code = value;
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return { message, code };
}

function decodeSpanEvent(buf: Buffer): { name: string; timeUnixNano?: string; attributes?: Record<string, any> } {
  let pos = 0;
  let name = '';
  let timeUnixNano: string | undefined;
  const attributes: Record<string, any> = {};
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;
    if (tag.fieldNum === 1 && tag.wireType === 1) {
      const fixed = readFixed64AsString(buf, pos);
      pos = fixed.nextOffset;
      timeUnixNano = fixed.value;
    } else if (tag.fieldNum === 2 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      name = slice.toString('utf-8');
    } else if (tag.fieldNum === 3 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      const kv = decodeKeyValue(slice);
      setDecodedKey(attributes, kv.key, kv.value);
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return { name, timeUnixNano, attributes };
}

function decodeSpan(buf: Buffer): any {
  let pos = 0;
  const span: any = {
    attributes: {}
  };

  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;
    const { fieldNum, wireType } = tag;

    if (fieldNum === 1 && wireType === 2) {
      // trace_id (16 bytes binário -> hex string de 32 caracteres)
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      span.traceId = slice.toString('hex');
    } else if (fieldNum === 2 && wireType === 2) {
      // span_id (8 bytes binário -> hex string de 16 caracteres)
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      span.spanId = slice.toString('hex');
    } else if (fieldNum === 3 && wireType === 2) {
      // trace_state
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      span.traceState = slice.toString('utf-8');
    } else if (fieldNum === 4 && wireType === 2) {
      // parent_span_id (8 bytes binário -> hex string de 16 caracteres)
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      span.parentSpanId = slice.length > 0 ? slice.toString('hex') : undefined;
    } else if (fieldNum === 5 && wireType === 2) {
      // name
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      span.name = slice.toString('utf-8');
    } else if (fieldNum === 6 && wireType === 0) {
      // kind
      const { value, nextOffset } = readVarintNumber(buf, pos);
      pos = nextOffset;
      span.kind = value;
    } else if (fieldNum === 7 && wireType === 1) {
      // start_time_unix_nano (fixed64)
      const fixed = readFixed64AsString(buf, pos);
      pos = fixed.nextOffset;
      span.startTimeUnixNano = fixed.value;
    } else if (fieldNum === 8 && wireType === 1) {
      // end_time_unix_nano (fixed64)
      const fixed = readFixed64AsString(buf, pos);
      pos = fixed.nextOffset;
      span.endTimeUnixNano = fixed.value;
    } else if (fieldNum === 9 && wireType === 2) {
      // attributes
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      const kv = decodeKeyValue(slice);
      setDecodedKey(span.attributes, kv.key, kv.value);
    } else if (fieldNum === 11 && wireType === 2) {
      // events
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      if (!span.events) span.events = [];
      span.events.push(decodeSpanEvent(slice));
    } else if (fieldNum === 15 && wireType === 2) {
      // status
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      span.status = decodeStatus(slice);
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }

  return span;
}

function decodeInstrumentationScope(buf: Buffer): { name?: string; version?: string } {
  let pos = 0;
  const scope: { name?: string; version?: string } = {};
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;
    if (tag.fieldNum === 1 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      scope.name = slice.toString('utf-8');
    } else if (tag.fieldNum === 2 && tag.wireType === 2) {
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      scope.version = slice.toString('utf-8');
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return scope;
}

function decodeScopeSpans(buf: Buffer): any {
  let pos = 0;
  const scopeSpans: any = { spans: [] };
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;

    if (tag.fieldNum === 1 && tag.wireType === 2) {
      // scope: name=1, version=2
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      scopeSpans.scope = decodeInstrumentationScope(slice);
    } else if (tag.fieldNum === 2 && tag.wireType === 2) {
      // spans
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      scopeSpans.spans.push(decodeSpan(slice));
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return scopeSpans;
}

function decodeResource(buf: Buffer): { attributes: Record<string, any> } {
  let pos = 0;
  const attributes: Record<string, any> = {};
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;

    if (tag.fieldNum === 1 && tag.wireType === 2) {
      // attributes
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      const kv = decodeKeyValue(slice);
      setDecodedKey(attributes, kv.key, kv.value);
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return { attributes };
}

function decodeResourceSpans(buf: Buffer): any {
  let pos = 0;
  const resSpan: any = { scopeSpans: [], resource: { attributes: {} } };
  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;

    if (tag.fieldNum === 1 && tag.wireType === 2) {
      // resource
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      resSpan.resource = decodeResource(slice);
    } else if (tag.fieldNum === 2 && tag.wireType === 2) {
      // scope_spans
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      resSpan.scopeSpans.push(decodeScopeSpans(slice));
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return resSpan;
}

/**
 * Decodifica o payload binário de uma requisição ExportTraceServiceRequest (OTLP/Protobuf)
 * retornando um objeto estruturado compatível com `parseOtlpTracesPayload`.
 * Lança `OtlpDecodeError` se o payload estiver malformado.
 */
export function decodeOtlpProtobufTraces(buf: Buffer): OtlpDecodedTracePayload {
  let pos = 0;
  const req: OtlpDecodedTracePayload = { resourceSpans: [] };
  if (!buf || buf.length === 0) return req;

  while (pos < buf.length) {
    const tag = readTag(buf, pos);
    pos = tag.nextOffset;

    if (tag.fieldNum === 1 && tag.wireType === 2) {
      // resource_spans
      const { slice, nextOffset } = readLengthDelimited(buf, pos);
      pos = nextOffset;
      req.resourceSpans.push(decodeResourceSpans(slice));
    } else {
      pos = skipField(buf, pos, tag.wireType);
    }
  }
  return req;
}
