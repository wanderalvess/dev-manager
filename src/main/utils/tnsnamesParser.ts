import fs from 'fs';
import path from 'path';
import { OracleTnsEntry, ParseTnsNamesResult } from '../../shared/types';
import { isSafeLocalPath } from './security';

/**
 * Remove comentários de um arquivo tnsnames.ora (# até fim da linha).
 */
export function stripTnsComments(content: string): string {
  return content.replace(/#.*$/gm, '');
}

/**
 * Extrai o valor de um token chave-valor simples dentro de uma string TNS.
 * Exemplo: (HOST = localhost) -> "localhost"
 */
function extractTokenValue(block: string, key: string): string | undefined {
  const regex = new RegExp(`\\(\\s*${key}\\s*=\\s*([^()\\s]+)\\s*\\)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * Faz o parsing do conteúdo textual de um arquivo tnsnames.ora e retorna as entradas encontradas.
 */
export function parseTnsNamesContent(content: string): OracleTnsEntry[] {
  const cleanContent = stripTnsComments(content);
  const entries: OracleTnsEntry[] = [];

  let pos = 0;
  const len = cleanContent.length;

  while (pos < len) {
    // Procura o início de uma nova entrada: ALIAS = (
    // Pula espaços em branco
    while (pos < len && /\s/.test(cleanContent[pos])) {
      pos++;
    }
    if (pos >= len) break;

    // Busca o separador '='
    const equalsPos = cleanContent.indexOf('=', pos);
    if (equalsPos === -1) break;

    // A parte antes do '=' são os aliases (pode ser "ALIAS1, ALIAS1.WORLD")
    const rawAliases = cleanContent.slice(pos, equalsPos).trim();
    if (!rawAliases || rawAliases.includes('(') || rawAliases.includes(')')) {
      // Linha inválida ou pedaço solto de bloco anterior, avança até a próxima linha
      const nextLine = cleanContent.indexOf('\n', pos);
      pos = nextLine === -1 ? len : nextLine + 1;
      continue;
    }

    // Avança para depois do '='
    let cursor = equalsPos + 1;
    while (cursor < len && /\s/.test(cleanContent[cursor])) {
      cursor++;
    }

    // Deve começar com '('
    if (cursor >= len || cleanContent[cursor] !== '(') {
      pos = cursor;
      continue;
    }

    // Rastreia o bloco completo delimitado por parênteses balanceados
    let depth = 0;
    const blockStart = cursor;
    let blockEnd = -1;

    for (let i = cursor; i < len; i++) {
      if (cleanContent[i] === '(') {
        depth++;
      } else if (cleanContent[i] === ')') {
        depth--;
        if (depth === 0) {
          blockEnd = i + 1;
          break;
        }
      }
    }

    if (blockEnd === -1) {
      // Bloco não fechado, interrompe
      break;
    }

    const descriptor = cleanContent.slice(blockStart, blockEnd);
    pos = blockEnd;

    // Extrai propriedades de conexão
    const host = extractTokenValue(descriptor, 'HOST');
    const portStr = extractTokenValue(descriptor, 'PORT');
    const port = portStr ? parseInt(portStr, 10) : 1521;
    const protocol = extractTokenValue(descriptor, 'PROTOCOL') || 'TCP';
    const serviceName = extractTokenValue(descriptor, 'SERVICE_NAME');
    const sid = extractTokenValue(descriptor, 'SID');
    const server = extractTokenValue(descriptor, 'SERVER');

    const oracleMode: 'serviceName' | 'sid' = sid && !serviceName ? 'sid' : 'serviceName';

    // Separa aliases múltiplos (ex: "XE, XE.LOCALDOMAIN")
    const aliases = rawAliases
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    for (const alias of aliases) {
      // Ignora entradas internas que não são conexões reais comuns (ex: EXTPROC)
      if (protocol.toUpperCase() === 'IPC' && !host) {
        continue;
      }

      entries.push({
        alias,
        host: host || 'localhost',
        port: isNaN(port) ? 1521 : port,
        serviceName: serviceName || undefined,
        sid: sid || undefined,
        oracleMode,
        protocol,
        server: server || undefined
      });
    }
  }

  // Ordena entradas alfabeticamente pelo alias
  return entries.sort((a, b) => a.alias.localeCompare(b.alias));
}

/**
 * Lê o arquivo do disco com validação de segurança e faz o parsing das entradas TNS.
 */
export function parseTnsNamesFile(filePath: string): ParseTnsNamesResult {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, entries: [], error: 'Caminho do arquivo tnsnames.ora não informado.' };
  }

  if (!isSafeLocalPath(filePath)) {
    return { success: false, entries: [], error: 'Caminho inseguro ou não permitido.' };
  }

  try {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return {
        success: false,
        filePath: resolvedPath,
        entries: [],
        error: `Arquivo tnsnames.ora não encontrado em: "${resolvedPath}".`
      };
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return {
        success: false,
        filePath: resolvedPath,
        entries: [],
        error: `O caminho informado não é um arquivo: "${resolvedPath}".`
      };
    }

    // Limite de segurança para arquivos de texto TNS (5 MB)
    if (stats.size > 5 * 1024 * 1024) {
      return {
        success: false,
        filePath: resolvedPath,
        entries: [],
        error: 'Arquivo tnsnames.ora muito grande (excede o limite de 5 MB).'
      };
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const entries = parseTnsNamesContent(content);

    return {
      success: true,
      filePath: resolvedPath,
      entries
    };
  } catch (err: any) {
    return {
      success: false,
      filePath,
      entries: [],
      error: `Erro ao ler arquivo tnsnames.ora: ${err?.message || String(err)}`
    };
  }
}
