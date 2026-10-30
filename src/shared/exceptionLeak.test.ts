import { describe, expect, it } from 'vitest';
import { detectExposure, exposureExcerpts } from './authLockoutAnalysis';
import { excerptAround, hasExceptionMessage } from './exceptionLeak';

const wtaError = (detailedMessage: string) => JSON.stringify({ code: 'UNK-ERR', message: 'Erro de Requisição', detailedMessage, details: [] }, null, 4);

describe('mensagem crua de exceção na resposta', () => {
  it('reconhece as mensagens do Java, Spring, Jackson e Hibernate mesmo sem o nome da classe', () => {
    for (const text of [
      'For input string: "NUMERO"',
      'Failed to convert value of type [java.lang.String] to required type [java.time.LocalDateTime]',
      "Failed to convert property value of type 'java.lang.String'",
      'nested exception is com.fasterxml.jackson.core.JsonParseException',
      'Parse attempt failed for value [NAO-E-DATA]',
      "Text '31/02/2026' could not be parsed at index 2",
      'No enum constant br.com.pcsist.Situacao.X',
      'Cannot invoke "String.length()" because "nome" is null',
      'Index 3 out of bounds for length 2',
      'JSON parse error: Unexpected character',
      'Cannot deserialize value of type `java.lang.Integer` from String "abc"',
      'Unrecognized field "campoQueNaoExiste"',
      "Required request parameter 'codfilial' for method parameter type String is not present",
      'Required request body is missing',
      'could not execute statement; SQL [n/a]',
      'tipo [java.math.BigDecimal]'
    ]) {
      expect(hasExceptionMessage(text), text).toBe(true);
    }
  });

  it('não reprova mensagem de negócio escrita para o usuário', () => {
    for (const text of [
      'Erro de Requisição',
      'Filial 99 não encontrada.',
      'O campo data deve estar no formato dd/mm/aaaa.',
      'Informe um número válido para o pedido.',
      'Pedido 123 já foi faturado.'
    ]) {
      expect(hasExceptionMessage(text), text).toBe(false);
    }
  });

  it('os dois exemplos de UNK-ERR do WTA reprovam, com o trecho legível (sem os escapes do JSON)', () => {
    const numero = wtaError('For input string: "NUMERO"');
    expect(detectExposure({ body: numero, secrets: [] })).toEqual(['exception-message']);
    expect(exposureExcerpts({ body: numero, secrets: [] })['exception-message']).toContain('For input string: "NUMERO"');

    const data = wtaError(
      "Failed to convert value of type [java.lang.String] to required type [java.time.LocalDateTime]; nested exception is org.springframework.core.convert.ConversionFailedException: Failed to convert from type [java.lang.String] to type [java.time.LocalDateTime] for value 'NAO-E-DATA'; nested exception is java.lang.IllegalArgumentException: Parse attempt failed for value [NAO-E-DATA]"
    );
    expect(detectExposure({ body: data, secrets: [] }).sort()).toEqual(['exception-message', 'stack-trace']);
    const excerpts = exposureExcerpts({ body: data, secrets: [] });
    expect(excerpts['stack-trace']).toContain('org.springframework.core.convert.ConversionFailedException');
    expect(excerpts['exception-message']).toContain('Failed to convert value of type [java.lang.String]');
  });

  it('nome de classe de exceção conta só como stack trace, não duas vezes', () => {
    expect(detectExposure({ body: '{"erro":"java.lang.NullPointerException"}', secrets: [] })).toEqual(['stack-trace']);
  });

  it('trecho com contexto e reticências nas pontas cortadas', () => {
    const text = `${'x'.repeat(70)} For input string: "NUMERO" ${'y'.repeat(100)}`;
    const excerpt = excerptAround(text, /For input string: "/);
    expect(excerpt).toMatch(/^…x+ For input string: "NUMERO" y+…$/);
    expect(excerptAround('nada aqui', /For input string/)).toBeUndefined();
    // Para no fim da linha: não emenda o campo seguinte nem os cabeçalhos
    expect(excerptAround('{\n  "detailedMessage": "For input string: "NUMERO"",\n  "details": []\n}\ncontent-type: json', /For input string: "/)).toBe(
      '"detailedMessage": "For input string: "NUMERO"",'
    );
  });
});
