/**
 * Decodificador de baixo nível e alto desempenho para payloads binários OTLP Protobuf (v1/traces).
 * Permite que o Dev Manager APM receba traces nativos enviados pelo OpenTelemetry Java Agent
 * (protocolo padrão `http/protobuf` via Content-Type: `application/x-protobuf`)
 * sem requerer dependências externas pesadas ou compilação nativa.
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
 * Lê um varint (base 128) a partir de um buffer e offset.
 */
export function readVarint(buf: Buffer, offset: number): { value: bigint; nextOffset: number } {
  let value = 0n;
  let shift = 0n;
  let pos = offset;
  while (pos < buf.length) {
    const b = buf[pos++];
    value |= BigInt(b & 0x7f) << shift;
    shift += 7n;
    if ((b & 0x80) === 0) break;
  }
  return { value, nextOffset: pos };
}

/**
 * Pula um campo com base no seu wire type Protobuf.
 */
export function skipField(buf: Buffer, offset: number, wireType: number): number {
  switch (wireType) {
    case 0: // Varint
      return readVarint(buf, offset).nextOffset;
    case 1: // 64-bit (fixed64, double)
      return Math.min(buf.length, offset + 8);
    case 2: { // Length-delimited
      const { value: len, nextOffset } = readVarint(buf, offset);
      return Math.min(buf.length, nextOffset + Number(len));
    }
    case 5: // 32-bit (fixed32, float)
      return Math.min(buf.length, offset + 4);
    default:
      // Se wire type desconhecido, avança até o fim para evitar loop infinito
      return buf.length;
  }
}

/**
 * Lê uma fatia delimitada por comprimento (wire type 2).
 */
export function readLengthDelimited(buf: Buffer, offset: number): { slice: Buffer; nextOffset: number } {
  const { value: len, nextOffset } = readVarint(buf, offset);
  const end = Math.min(buf.length, nextOffset + Number(len));
  return { slice: buf.subarray(nextOffset, end), nextOffset: end };
}

/**
 * Decodifica uma mensagem AnyValue do OpenTelemetry.
 */
export function decodeAnyValue(buf: Buffer): any {
  let pos = 0;
  let result: any = null;
  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);

    if (fieldNum === 1 && wireType === 2) {
      // string_value
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      result = slice.toString('utf-8');
    } else if (fieldNum === 2 && wireType === 0) {
      // bool_value
      const { value, nextOffset: no } = readVarint(buf, pos);
      pos = no;
      result = value !== 0n;
    } else if (fieldNum === 3 && wireType === 0) {
      // int_value
      const { value, nextOffset: no } = readVarint(buf, pos);
      pos = no;
      const num = Number(value);
      result = Number.isSafeInteger(num) ? num : value.toString();
    } else if (fieldNum === 4 && wireType === 1) {
      // double_value
      if (pos + 8 <= buf.length) {
        result = buf.readDoubleLE(pos);
      }
      pos += 8;
    } else if (fieldNum === 5 && wireType === 2) {
      // array_value
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      result = decodeArrayValue(slice);
    } else if (fieldNum === 6 && wireType === 2) {
      // kvlist_value
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      result = decodeKeyValueList(slice);
    } else if (fieldNum === 7 && wireType === 2) {
      // bytes_value
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      result = slice.toString('hex');
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  return result;
}

function decodeArrayValue(buf: Buffer): any[] {
  let pos = 0;
  const values: any[] = [];
  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);
    if (fieldNum === 1 && wireType === 2) {
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      values.push(decodeAnyValue(slice));
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  return values;
}

export function decodeKeyValue(buf: Buffer): { key: string; value: any } {
  let pos = 0;
  let keyStr = '';
  let val: any = null;
  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);
    if (fieldNum === 1 && wireType === 2) {
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      keyStr = slice.toString('utf-8');
    } else if (fieldNum === 2 && wireType === 2) {
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      val = decodeAnyValue(slice);
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  return { key: keyStr, value: val };
}

function decodeKeyValueList(buf: Buffer): Record<string, any> {
  let pos = 0;
  const obj: Record<string, any> = {};
  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);
    if (fieldNum === 1 && wireType === 2) {
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      const kv = decodeKeyValue(slice);
      if (kv.key) obj[kv.key] = kv.value;
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  return obj;
}

function decodeStatus(buf: Buffer): { message?: string; code?: number } {
  let pos = 0;
  let message: string | undefined;
  let code: number | undefined;
  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);
    if (fieldNum === 2 && wireType === 2) {
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      message = slice.toString('utf-8');
    } else if (fieldNum === 3 && wireType === 0) {
      const { value, nextOffset: no } = readVarint(buf, pos);
      pos = no;
      code = Number(value);
    } else {
      pos = skipField(buf, pos, wireType);
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
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);
    if (fieldNum === 1 && wireType === 1) {
      if (pos + 8 <= buf.length) {
        timeUnixNano = buf.readBigUInt64LE(pos).toString();
      }
      pos += 8;
    } else if (fieldNum === 2 && wireType === 2) {
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      name = slice.toString('utf-8');
    } else if (fieldNum === 3 && wireType === 2) {
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      const kv = decodeKeyValue(slice);
      if (kv.key) attributes[kv.key] = kv.value;
    } else {
      pos = skipField(buf, pos, wireType);
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
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);

    if (fieldNum === 1 && wireType === 2) {
      // trace_id (16 bytes binário -> hex string de 32 caracteres)
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      span.traceId = slice.toString('hex');
    } else if (fieldNum === 2 && wireType === 2) {
      // span_id (8 bytes binário -> hex string de 16 caracteres)
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      span.spanId = slice.toString('hex');
    } else if (fieldNum === 3 && wireType === 2) {
      // trace_state
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      span.traceState = slice.toString('utf-8');
    } else if (fieldNum === 4 && wireType === 2) {
      // parent_span_id (8 bytes binário -> hex string de 16 caracteres)
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      span.parentSpanId = slice.length > 0 ? slice.toString('hex') : undefined;
    } else if (fieldNum === 5 && wireType === 2) {
      // name
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      span.name = slice.toString('utf-8');
    } else if (fieldNum === 6 && wireType === 0) {
      // kind
      const { value, nextOffset: no } = readVarint(buf, pos);
      pos = no;
      span.kind = Number(value);
    } else if (fieldNum === 7 && wireType === 1) {
      // start_time_unix_nano (fixed64)
      if (pos + 8 <= buf.length) {
        span.startTimeUnixNano = buf.readBigUInt64LE(pos).toString();
      }
      pos += 8;
    } else if (fieldNum === 8 && wireType === 1) {
      // end_time_unix_nano (fixed64)
      if (pos + 8 <= buf.length) {
        span.endTimeUnixNano = buf.readBigUInt64LE(pos).toString();
      }
      pos += 8;
    } else if (fieldNum === 9 && wireType === 2) {
      // attributes
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      const kv = decodeKeyValue(slice);
      if (kv.key) {
        span.attributes[kv.key] = kv.value;
      }
    } else if (fieldNum === 11 && wireType === 2) {
      // events
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      if (!span.events) span.events = [];
      span.events.push(decodeSpanEvent(slice));
    } else if (fieldNum === 15 && wireType === 2) {
      // status
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      span.status = decodeStatus(slice);
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }

  return span;
}

function decodeScopeSpans(buf: Buffer): any {
  let pos = 0;
  const scopeSpans: any = { spans: [] };
  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);

    if (fieldNum === 1 && wireType === 2) {
      // scope: name=1, version=2
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      let scopePos = 0;
      const scope: any = {};
      while (scopePos < slice.length) {
        const { value: sKey, nextOffset: sNo } = readVarint(slice, scopePos);
        scopePos = sNo;
        const sField = Number(sKey >> 3n);
        const sWire = Number(sKey & 0x07n);
        if (sField === 1 && sWire === 2) {
          const { slice: nameSlice, nextOffset: nEnd } = readLengthDelimited(slice, scopePos);
          scopePos = nEnd;
          scope.name = nameSlice.toString('utf-8');
        } else if (sField === 2 && sWire === 2) {
          const { slice: verSlice, nextOffset: vEnd } = readLengthDelimited(slice, scopePos);
          scopePos = vEnd;
          scope.version = verSlice.toString('utf-8');
        } else {
          scopePos = skipField(slice, scopePos, sWire);
        }
      }
      scopeSpans.scope = scope;
    } else if (fieldNum === 2 && wireType === 2) {
      // spans
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      scopeSpans.spans.push(decodeSpan(slice));
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  return scopeSpans;
}

function decodeResource(buf: Buffer): { attributes: Record<string, any> } {
  let pos = 0;
  const attributes: Record<string, any> = {};
  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);

    if (fieldNum === 1 && wireType === 2) {
      // attributes
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      const kv = decodeKeyValue(slice);
      if (kv.key) attributes[kv.key] = kv.value;
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  return { attributes };
}

function decodeResourceSpans(buf: Buffer): any {
  let pos = 0;
  const resSpan: any = { scopeSpans: [], resource: { attributes: {} } };
  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);

    if (fieldNum === 1 && wireType === 2) {
      // resource
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      resSpan.resource = decodeResource(slice);
    } else if (fieldNum === 2 && wireType === 2) {
      // scope_spans
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      resSpan.scopeSpans.push(decodeScopeSpans(slice));
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  return resSpan;
}

/**
 * Decodifica o payload binário de uma requisição ExportTraceServiceRequest (OTLP/Protobuf)
 * retornando um objeto estruturado compátivel com `parseOtlpTracesPayload`.
 */
export function decodeOtlpProtobufTraces(buf: Buffer): OtlpDecodedTracePayload {
  let pos = 0;
  const req: OtlpDecodedTracePayload = { resourceSpans: [] };
  if (!buf || buf.length === 0) return req;

  while (pos < buf.length) {
    const { value: key, nextOffset } = readVarint(buf, pos);
    pos = nextOffset;
    const fieldNum = Number(key >> 3n);
    const wireType = Number(key & 0x07n);

    if (fieldNum === 1 && wireType === 2) {
      // resource_spans
      const { slice, nextOffset: no } = readLengthDelimited(buf, pos);
      pos = no;
      req.resourceSpans.push(decodeResourceSpans(slice));
    } else {
      pos = skipField(buf, pos, wireType);
    }
  }
  return req;
}
