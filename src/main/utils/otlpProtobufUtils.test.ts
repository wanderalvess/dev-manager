import { describe, it, expect } from 'vitest';
import {
  decodeOtlpProtobufTraces,
  readVarint,
  decodeAnyValue,
  decodeKeyValue,
  skipField,
  OtlpDecodeError
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
      // skipField recebe o offset logo após a tag: o campo length-delimited começa pelo comprimento
      const lengthDelimited = Buffer.concat([encodeVarint(6), Buffer.from('skipme')]);
      const buf = Buffer.concat([encodeVarint(12345), Buffer.alloc(8), lengthDelimited, Buffer.alloc(4)]);

      let offset = 0;
      offset = skipField(buf, offset, 0);
      expect(offset).toBe(encodeVarint(12345).length);
      offset = skipField(buf, offset, 1);
      offset = skipField(buf, offset, 2);
      expect(offset).toBe(buf.length - 4);
      offset = skipField(buf, offset, 5);
      expect(offset).toBe(buf.length);
    });
  });

  describe('payload malformado ou hostil', () => {
    it('rejeita varint com mais de 10 bytes sem custo quadrático', () => {
      const hostile = Buffer.alloc(5 * 1024 * 1024, 0xff);
      const start = performance.now();
      expect(() => readVarint(hostile, 0)).toThrow(OtlpDecodeError);
      expect(() => decodeOtlpProtobufTraces(hostile)).toThrow(OtlpDecodeError);
      expect(performance.now() - start).toBeLessThan(500);
    });

    it('rejeita varint truncado no fim do buffer', () => {
      expect(() => readVarint(Buffer.from([0x80, 0x80]), 0)).toThrow(OtlpDecodeError);
    });

    it('rejeita campo length-delimited que declara mais bytes do que existem', () => {
      // resource_spans declarando 127 bytes, com apenas 2 presentes
      expect(() => decodeOtlpProtobufTraces(Buffer.from([0x0a, 0x7f, 0x01, 0x02]))).toThrow(OtlpDecodeError);
    });

    it('rejeita campo fixed64 truncado', () => {
      const span = Buffer.concat([encodeTag(7, 1), Buffer.alloc(3)]);
      const scope = encodeLengthDelimited(2, span);
      const resource = encodeLengthDelimited(2, scope);
      expect(() => decodeOtlpProtobufTraces(encodeLengthDelimited(1, resource))).toThrow(OtlpDecodeError);
    });

    it('rejeita wire type de grupo (inexistente no OTLP)', () => {
      expect(() => decodeOtlpProtobufTraces(Buffer.from([0x0b]))).toThrow(OtlpDecodeError);
    });

    it('ignora chave de atributo __proto__', () => {
      const kv = (key: string, value: string) =>
        encodeLengthDelimited(9, Buffer.concat([encodeStringField(1, key), encodeLengthDelimited(2, encodeStringField(1, value))]));
      const span = Buffer.concat([
        encodeLengthDelimited(1, Buffer.alloc(16, 1)),
        encodeLengthDelimited(2, Buffer.alloc(8, 2)),
        kv('__proto__', 'x'),
        kv('ok', 'sim')
      ]);
      const decoded = decodeOtlpProtobufTraces(
        encodeLengthDelimited(1, encodeLengthDelimited(2, encodeLengthDelimited(2, span)))
      );
      const attrs = decoded.resourceSpans[0].scopeSpans![0].spans[0].attributes!;
      expect(Object.getPrototypeOf(attrs)).toBe(Object.prototype);
      expect(attrs).toEqual({ ok: 'sim' });
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

    it('deve decodificar int64 negativo (complemento de dois em varint de 10 bytes)', () => {
      const anyBuf = Buffer.concat([encodeTag(3, 0), encodeVarint(BigInt.asUintN(64, -5n))]);
      expect(decodeAnyValue(anyBuf)).toBe(-5);
    });

    it('deve devolver int64 fora do intervalo seguro como string', () => {
      const anyBuf = Buffer.concat([encodeTag(3, 0), encodeVarint(9_007_199_254_740_993n)]);
      expect(decodeAnyValue(anyBuf)).toBe('9007199254740993');
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

    it('deve decodificar evento de exceção do Java Agent e expor o stacktrace no span', () => {
      const kv = (key: string, value: string) =>
        Buffer.concat([encodeStringField(1, key), encodeLengthDelimited(2, encodeStringField(1, value))]);
      const eventBuf = Buffer.concat([
        encodeFixed64Field(1, 1711200000100000000n),
        encodeStringField(2, 'exception'),
        encodeLengthDelimited(3, kv('exception.type', 'java.lang.NullPointerException')),
        encodeLengthDelimited(3, kv('exception.stacktrace', 'java.lang.NullPointerException\n\tat Foo.bar(Foo.java:10)'))
      ]);
      const spanBuf = Buffer.concat([
        encodeLengthDelimited(1, Buffer.from('0123456789abcdef0123456789abcdef', 'hex')),
        encodeLengthDelimited(2, Buffer.from('abcdef0123456789', 'hex')),
        encodeStringField(5, 'POST /pedidos'),
        encodeFixed64Field(7, 1711200000000000000n),
        encodeFixed64Field(8, 1711200000200000000n),
        encodeLengthDelimited(11, eventBuf),
        encodeLengthDelimited(15, Buffer.concat([encodeTag(3, 0), encodeVarint(2)])) // STATUS_CODE_ERROR
      ]);
      const exportReqBuf = encodeLengthDelimited(1, encodeLengthDelimited(2, encodeLengthDelimited(2, spanBuf)));

      const [span] = parseOtlpTracesPayload(decodeOtlpProtobufTraces(exportReqBuf));
      expect(span.statusCode).toBe('ERROR');
      expect(span.exception?.type).toBe('java.lang.NullPointerException');
      expect(span.exception?.stacktrace).toContain('at Foo.bar(Foo.java:10)');
      expect(span.statusMessage).toBe('java.lang.NullPointerException');
      expect(span.events?.[0].timestampUnixMs).toBe(1711200000100);
    });
  });
});
