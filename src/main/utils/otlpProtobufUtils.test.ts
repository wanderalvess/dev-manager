import { describe, it, expect } from 'vitest';
import {
  decodeOtlpProtobufTraces,
  readVarint,
  decodeAnyValue,
  decodeKeyValue,
  skipField
} from './otlpProtobufUtils';
import { parseOtlpTracesPayload } from './apmUtils';

/**
 * Funções auxiliares para serializar varints e campos protobuf para testes unitários.
 */
function encodeVarint(val: number | bigint): Buffer {
  let v = BigInt(val);
  const bytes: number[] = [];
  while (v >= 0x80n) {
    bytes.push(Number((v & 0x7fn) | 0x80n));
    v >>= 7n;
  }
  bytes.push(Number(v & 0x7fn));
  return Buffer.from(bytes);
}

function encodeTag(fieldNum: number, wireType: number): Buffer {
  return encodeVarint((BigInt(fieldNum) << 3n) | BigInt(wireType));
}

function encodeLengthDelimited(fieldNum: number, data: Buffer): Buffer {
  return Buffer.concat([
    encodeTag(fieldNum, 2),
    encodeVarint(data.length),
    data
  ]);
}

function encodeStringField(fieldNum: number, str: string): Buffer {
  return encodeLengthDelimited(fieldNum, Buffer.from(str, 'utf-8'));
}

function encodeFixed64Field(fieldNum: number, val: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(val, 0);
  return Buffer.concat([encodeTag(fieldNum, 1), buf]);
}

describe('otlpProtobufUtils', () => {
  describe('primitivas protobuf (varint e skipField)', () => {
    it('deve codificar e ler varints corretamente', () => {
      const v = 300;
      const buf = encodeVarint(v);
      const res = readVarint(buf, 0);
      expect(Number(res.value)).toBe(300);
      expect(res.nextOffset).toBe(buf.length);
    });

    it('deve pular campos com wireType 0, 1, 2, 5 sem erro', () => {
      const buf = Buffer.concat([
        encodeVarint(12345),
        Buffer.alloc(8),
        encodeLengthDelimited(99, Buffer.from('skipme')),
        Buffer.alloc(4)
      ]);

      let offset = 0;
      offset = skipField(buf, offset, 0);
      offset = skipField(buf, offset, 1);
      offset = skipField(buf, offset, 2);
      offset = skipField(buf, offset, 5);
      expect(offset).toBe(buf.length);
    });
  });

  describe('decodeAnyValue e decodeKeyValue', () => {
    it('deve decodificar AnyValue do tipo string', () => {
      const anyBuf = encodeStringField(1, 'minha-string');
      expect(decodeAnyValue(anyBuf)).toBe('minha-string');
    });

    it('deve decodificar AnyValue do tipo bool', () => {
      const anyBuf = Buffer.concat([encodeTag(2, 0), encodeVarint(1)]);
      expect(decodeAnyValue(anyBuf)).toBe(true);
    });

    it('deve decodificar AnyValue do tipo int', () => {
      const anyBuf = Buffer.concat([encodeTag(3, 0), encodeVarint(42)]);
      expect(decodeAnyValue(anyBuf)).toBe(42);
    });

    it('deve decodificar KeyValue corretamente', () => {
      const valBuf = encodeStringField(1, 'valor-teste');
      const kvBuf = Buffer.concat([
        encodeStringField(1, 'chave.exemplo'),
        encodeLengthDelimited(2, valBuf)
      ]);
      const kv = decodeKeyValue(kvBuf);
      expect(kv.key).toBe('chave.exemplo');
      expect(kv.value).toBe('valor-teste');
    });
  });

  describe('decodeOtlpProtobufTraces', () => {
    it('deve retornar resourceSpans vazio se o buffer for vazio', () => {
      const res = decodeOtlpProtobufTraces(Buffer.alloc(0));
      expect(res).toEqual({ resourceSpans: [] });
    });

    it('deve decodificar um trace completo do Karaf com atributos e timestamps', () => {
      // 1. Constrói atributo service.name no Resource
      const valBuf = encodeStringField(1, 'karaf-winthor');
      const kvBuf = Buffer.concat([
        encodeStringField(1, 'service.name'),
        encodeLengthDelimited(2, valBuf)
      ]);
      const resBuf = encodeLengthDelimited(1, kvBuf);

      // 2. Constrói Span com traceId (16 bytes), spanId (8 bytes), nome e tempos
      const traceIdRaw = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
      const spanIdRaw = Buffer.from('abcdef0123456789', 'hex');
      const startNano = 1711200000000000000n;
      const endNano = 1711200000150000000n; // +150ms

      const spanAttrVal = encodeStringField(1, 'GET');
      const spanAttrKv = Buffer.concat([
        encodeStringField(1, 'http.method'),
        encodeLengthDelimited(2, spanAttrVal)
      ]);

      const statusBuf = Buffer.concat([
        encodeStringField(2, 'Operação concluída'),
        encodeTag(3, 0),
        encodeVarint(1) // STATUS_CODE_OK
      ]);

      const spanBuf = Buffer.concat([
        encodeLengthDelimited(1, traceIdRaw),
        encodeLengthDelimited(2, spanIdRaw),
        encodeStringField(5, '/api/produtos/listar'),
        encodeTag(6, 0),
        encodeVarint(2), // SPAN_KIND_SERVER
        encodeFixed64Field(7, startNano),
        encodeFixed64Field(8, endNano),
        encodeLengthDelimited(9, spanAttrKv),
        encodeLengthDelimited(15, statusBuf)
      ]);

      // 3. ScopeSpans
      const scopeSpansBuf = Buffer.concat([
        encodeLengthDelimited(2, spanBuf)
      ]);

      // 4. ResourceSpans
      const resourceSpansBuf = Buffer.concat([
        encodeLengthDelimited(1, resBuf),
        encodeLengthDelimited(2, scopeSpansBuf)
      ]);

      // 5. ExportTraceServiceRequest (field 1 = repeated resource_spans)
      const exportReqBuf = Buffer.concat([
        encodeLengthDelimited(1, resourceSpansBuf)
      ]);

      const decoded = decodeOtlpProtobufTraces(exportReqBuf);
      expect(decoded.resourceSpans).toHaveLength(1);

      // Passa pelo parseOtlpTracesPayload para garantir compatibilidade ponta a ponta
      const parsedSpans = parseOtlpTracesPayload(decoded);
      expect(parsedSpans).toHaveLength(1);
      const span = parsedSpans[0];
      expect(span.serviceName).toBe('karaf-winthor');
      expect(span.traceId).toBe('0123456789abcdef0123456789abcdef');
      expect(span.spanId).toBe('abcdef0123456789');
      expect(span.name).toBe('/api/produtos/listar');
      expect(span.kind).toBe('SERVER');
      expect(span.durationMs).toBe(150);
      expect(span.httpMethod).toBe('GET');
      expect(span.statusCode).toBe('OK');
    });
  });
});
