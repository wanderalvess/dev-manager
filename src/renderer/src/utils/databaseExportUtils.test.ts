import { describe, expect, it } from 'vitest';
import {
  buildCsvContent,
  buildJsonContent,
  buildXlsx,
  buildZip,
  columnLetter,
  crc32,
  escapeXml,
  exportFileName
} from './databaseExportUtils';

/** Lê um ZIP "stored" e devolve nome → conteúdo, validando assinatura, tamanhos e CRC de cada entrada. */
function readZip(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  // fim do diretório central
  const eocd = bytes.length - 22;
  expect(view.getUint32(eocd, true)).toBe(0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(pos, true)).toBe(0x02014b50);
    const crc = view.getUint32(pos + 16, true);
    const size = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.slice(pos + 46, pos + 46 + nameLen));
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const data = bytes.slice(dataStart, dataStart + size);
    expect(crc32(data)).toBe(crc);
    out[name] = decoder.decode(data);
    pos += 46 + nameLen;
  }
  return out;
}

describe('buildCsvContent', () => {
  it('gera cabeçalho e linhas entre aspas, separadas por CRLF', () => {
    expect(buildCsvContent(['ID', 'NAME'], [{ ID: 1, NAME: 'Ana' }])).toBe('ID,NAME\r\n"1","Ana"');
  });

  it('duplica aspas internas e deixa nulos vazios', () => {
    expect(buildCsvContent(['A', 'B'], [{ A: 'diz "oi"', B: null }, { A: undefined, B: 'x' }])).toBe('A,B\r\n"diz ""oi""",\r\n,"x"');
  });

  it('cabeçalho só ganha aspas quando precisa; só cabeçalho sem linhas', () => {
    expect(buildCsvContent(['NOME, COMPLETO', 'OK'], [])).toBe('"NOME, COMPLETO",OK');
  });

  it('objetos viram JSON e quebras de linha ficam dentro do campo', () => {
    expect(buildCsvContent(['O', 'T'], [{ O: { a: 1 }, T: 'l1\nl2' }])).toBe('O,T\r\n"{""a"":1}","l1\nl2"');
  });

  it('modo Excel Brasil: separador ";", BOM e vírgula decimal só nas colunas numéricas', () => {
    const csv = buildCsvContent(
      ['VALOR', 'CODIGO', 'OBS'],
      [{ VALOR: 12.5, CODIGO: '007', OBS: 'a;b' }, { VALOR: '1234.56', CODIGO: '1.5', OBS: 'x' }],
      { delimiter: ';', bom: true, decimalCommaColumns: new Set(['VALOR']) }
    );
    expect(csv.startsWith(String.fromCharCode(0xfeff) + 'VALOR;CODIGO;OBS')).toBe(true);
    expect(csv).toContain('"12,5";"007";"a;b"');
    expect(csv).toContain('"1234,56";"1.5";"x"');
  });
});

describe('buildJsonContent', () => {
  it('mantém a ordem das colunas, usa null para ausentes e indenta', () => {
    const json = buildJsonContent(['B', 'A'], [{ A: 1, B: 'x' }, { A: 2 }]);
    expect(JSON.parse(json)).toEqual([{ B: 'x', A: 1 }, { B: null, A: 2 }]);
    expect(json.indexOf('"B"')).toBeLessThan(json.indexOf('"A"'));
    expect(json).toContain('\n  ');
  });
});

describe('XLSX', () => {
  it('columnLetter e escapeXml', () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
    expect(escapeXml('a<b>&"c"\u0001')).toBe('a&lt;b&gt;&amp;&quot;c&quot;');
  });

  it('crc32 bate com o valor conhecido', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('o ZIP gerado é legível, com CRC e tamanhos corretos', () => {
    const entries = readZip(buildZip([{ name: 'a.txt', content: 'olá' }, { name: 'dir/b.txt', content: '' }]));
    expect(entries).toEqual({ 'a.txt': 'olá', 'dir/b.txt': '' });
  });

  it('gera os arquivos obrigatórios do pacote OOXML', () => {
    const files = readZip(buildXlsx(['A'], [{ A: 1 }]));
    expect(Object.keys(files).sort()).toEqual(
      ['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml'].sort()
    );
    expect(files['xl/workbook.xml']).toContain('name="Resultado"');
  });

  it('tipos de célula: número, booleano, texto, nulo e cabeçalho em negrito', () => {
    const sheet = readZip(buildXlsx(['N', 'B', 'T', 'X'], [{ N: 3.5, B: true, T: 'a & b', X: null }]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1">');
    expect(sheet).toContain('<c r="A2"><v>3.5</v></c>');
    expect(sheet).toContain('<c r="B2" t="b"><v>1</v></c>');
    expect(sheet).toContain('a &amp; b');
    expect(sheet).not.toContain('r="D2"');
  });

  it('texto numérico só vira número em coluna numérica e quando não perde informação', () => {
    const rows = [{ V: '1234.50', C: '007', G: '9007199254740993', OK: '42' }];
    const sheet = readZip(buildXlsx(['V', 'C', 'G', 'OK'], rows, { numericColumns: new Set(['V', 'C', 'G', 'OK']) }))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="D2"><v>42</v></c>');
    // "1234.50" mudaria para 1234.5, "007" para 7 e o inteiro grande perderia precisão: continuam texto
    expect(sheet).toContain('<c r="A2" t="inlineStr">');
    expect(sheet).toContain('<c r="B2" t="inlineStr">');
    expect(sheet).toContain('<c r="C2" t="inlineStr">');
    const text = readZip(buildXlsx(['V'], [{ V: '42' }]))['xl/worksheets/sheet1.xml'];
    expect(text).toContain('<c r="A2" t="inlineStr">');
  });

  it('nome da aba é saneado e limitado a 31 caracteres', () => {
    const wb = readZip(buildXlsx(['A'], [], { sheetName: 'Pedidos: [2026]/Q1*?\\ com um nome muito comprido' }))['xl/workbook.xml'];
    const name = /name="([^"]*)"/.exec(wb)![1];
    expect(name.length).toBeLessThanOrEqual(31);
    expect(name).not.toMatch(/[[\]:*?/\\]/);
  });

  it('caracteres inválidos em XML são removidos do conteúdo', () => {
    const sheet = readZip(buildXlsx(['A'], [{ A: 'ok\u0000\u0008fim' }]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('okfim');
  });
});

describe('exportFileName', () => {
  it('usa data e hora no nome', () => {
    expect(exportFileName('xlsx', new Date(2026, 9, 6, 14, 5, 9))).toBe('consulta_20261006_140509.xlsx');
  });
});
