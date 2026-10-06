export type ExportFormat = 'csv' | 'csv-br' | 'json' | 'xlsx';

type Row = Record<string, any>;

export const EXPORT_FORMATS: Array<{ id: ExportFormat; label: string; hint: string; extension: string; mime: string }> = [
  { id: 'xlsx', label: 'Excel (.xlsx)', hint: 'Números como números, cabeçalho em destaque', extension: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'csv-br', label: 'CSV para Excel (Brasil)', hint: 'Separador ";", decimal com vírgula e acentos corretos', extension: 'csv', mime: 'text/csv;charset=utf-8;' },
  { id: 'csv', label: 'CSV padrão', hint: 'Separador ",", UTF-8 (RFC 4180)', extension: 'csv', mime: 'text/csv;charset=utf-8;' },
  { id: 'json', label: 'JSON', hint: 'Lista de objetos, uma chave por coluna', extension: 'json', mime: 'application/json;charset=utf-8;' }
];

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export interface CsvOptions {
  delimiter?: string;
  /** Marca de ordem de bytes UTF-8: sem ela o Excel abre os acentos errados. */
  bom?: boolean;
  /** Colunas numéricas: a vírgula vira o separador decimal (Excel em português lê "12,5" como número). */
  decimalCommaColumns?: Set<string>;
}

const UTF8_BOM = String.fromCharCode(0xfeff);
const NUMERIC_TEXT = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

function csvCell(value: unknown, delimiter: string, forceQuote: boolean): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const needs = forceQuote || str.includes('"') || str.includes(delimiter) || /[\r\n]/.test(str);
  return needs ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Monta o conteúdo CSV de um resultado de consulta (RFC 4180). Valores nulos viram campo vazio e os
 * demais são sempre entre aspas, com aspas internas duplicadas; os nomes das colunas só ganham aspas quando precisam.
 */
export function buildCsvContent(columns: string[], rows: Row[], options: CsvOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const header = columns.map((c) => csvCell(c, delimiter, false)).join(delimiter);
  const lines = [header];

  for (const row of rows) {
    lines.push(
      columns
        .map((col) => {
          let val = row[col];
          if (options.decimalCommaColumns?.has(col) && (typeof val === 'number' || (typeof val === 'string' && NUMERIC_TEXT.test(val)))) {
            val = String(val).replace('.', ',');
          }
          return csvCell(val, delimiter, true);
        })
        .join(delimiter)
    );
  }

  const body = lines.join('\r\n');
  return options.bom ? `${UTF8_BOM}${body}` : body;
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

export function buildJsonContent(columns: string[], rows: Row[]): string {
  const ordered = rows.map((row) => {
    const obj: Row = {};
    for (const col of columns) obj[col] = row[col] ?? null;
    return obj;
  });
  return JSON.stringify(ordered, null, 2);
}

// ---------------------------------------------------------------------------
// XLSX (OOXML mínimo + ZIP sem compressão; sem dependências)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

/** ZIP "stored" (sem compressão): suficiente para o .xlsx e sem dependência de biblioteca. */
export function buildZip(files: Array<{ name: string; content: string }>): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // versão mínima
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint16(8, 0, true); // método: stored
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, dosTime, true);
    entry.setUint16(14, dosDate, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);

    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export function escapeXml(text: string): string {
  return text
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Nome de coluna da planilha: A, B, ..., Z, AA, AB... */
export function columnLetter(index: number): string {
  let n = index;
  let letters = '';
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters;
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Resultado';
}

export interface XlsxOptions {
  sheetName?: string;
  /** Colunas que o app detectou como numéricas: textos numéricos viram número (valores NUMERIC do PostgreSQL chegam como texto). */
  numericColumns?: Set<string>;
}

function xlsxCell(ref: string, value: unknown, asNumber: boolean, style?: number): string {
  const s = style !== undefined ? ` s="${style}"` : '';
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${s}><v>${value}</v></c>`;
  if (typeof value === 'boolean') return `<c r="${ref}" t="b"${s}><v>${value ? 1 : 0}</v></c>`;
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // "007" e números enormes precisam continuar texto: só converte quando o resultado é idêntico ao original
  if (asNumber && NUMERIC_TEXT.test(text) && String(Number(text)) === text) return `<c r="${ref}"${s}><v>${text}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

/** Planilha .xlsx (uma aba) com cabeçalho em negrito e largura de coluna proporcional ao conteúdo. */
export function buildXlsx(columns: string[], rows: Row[], options: XlsxOptions = {}): Uint8Array {
  const widths = columns.map((c) => c.length);
  for (const row of rows.slice(0, 200)) {
    columns.forEach((c, i) => {
      const v = row[c];
      if (v !== null && v !== undefined) widths[i] = Math.max(widths[i], Math.min(String(v).length, 60));
    });
  }

  const headerCells = columns.map((c, i) => xlsxCell(`${columnLetter(i)}1`, c, false, 1)).join('');
  const bodyRows = rows
    .map((row, r) => {
      const cells = columns
        .map((c, i) => xlsxCell(`${columnLetter(i)}${r + 2}`, row[c], !!options.numericColumns?.has(c)))
        .join('');
      return `<row r="${r + 2}">${cells}</row>`;
    })
    .join('');

  const sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(8, Math.min(w + 2, 62))}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData><row r="1">${headerCells}</row>${bodyRows}</sheetData>` +
    '</worksheet>';

  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  return buildZip([
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>'
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${escapeXml(sanitizeSheetName(options.sheetName ?? 'Resultado'))}" sheetId="1" r:id="rId1"/></sheets></workbook>`
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>'
    },
    { name: 'xl/styles.xml', content: styles },
    { name: 'xl/worksheets/sheet1.xml', content: sheet }
  ]);
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export function exportFileName(extension: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `consulta_${stamp}.${extension}`;
}

export function downloadBlob(content: BlobPart, filename: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
