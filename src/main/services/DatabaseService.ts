import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import {
  DatabaseConnectionConfig,
  QueryResult,
  TableColumnInfo,
  ExplainPlanResult,
  OracleTracerFilter,
  OracleActiveSessionsResult,
  OracleRecentStatementsResult,
  OracleCapturedBind,
  OracleStatementBindsResult
} from '../../shared/types';
import { getListeningPid } from '../utils/network';
import { isValidSqlIdentifier, isValidSqlTableName } from '../utils/security';
import {
  buildActiveSessionsQuery,
  buildRecentStatementsQuery,
  mapActiveSessionRow,
  mapRecentStatementRow,
  buildBindCaptureQuery,
  groupCapturedBindsBySqlId,
  interpolateOracleSqlWithBinds
} from '../utils/oracleTracerUtils';
import type { ConfigService } from './ConfigService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = __dirname;
}
if (typeof (globalThis as any).__filename === 'undefined') {
  (globalThis as any).__filename = __filename;
}

// Teto de segurança da listagem de tabelas. Schemas de ERP passam fácil de alguns
// milhares de tabelas, então o limite precisa ficar bem acima do de consultas comuns.
const MAX_LISTED_TABLES = 50000;

interface CachedConnection {
  conn: any;
  close: (conn: any) => Promise<void>;
  timer: ReturnType<typeof setTimeout>;
  queue: Promise<any>;
}

/**
 * Sanitiza valores retornados do banco de dados para garantir que possam ser
 * serializados via IPC do Electron (structuredClone) sem travar ou rejeitar.
 */
function sanitizeDbValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'bigint') return val.toString();
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (Buffer.isBuffer(val)) {
    return `[BLOB ${val.length} bytes]`;
  }
  if (typeof val === 'object') {
    // Se for um Stream / EventEmitter / oracledb.Lob que não foi convertido
    if (typeof (val as any).pipe === 'function' || typeof (val as any).read === 'function') {
      return '[LOB Stream]';
    }
    try {
      return JSON.parse(JSON.stringify(val));
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function sanitizeRows(rows: Record<string, any>[], columns: string[]): Record<string, any>[] {
  return rows.map((row) => {
    const clean: Record<string, any> = {};
    for (const col of columns) {
      clean[col] = sanitizeDbValue(row[col]);
    }
    return clean;
  });
}

export class DatabaseService {
  constructor(private configService?: ConfigService) {}

  /**
   * Resolve a senha da conexão caso tenha vindo em branco/sanitizada, buscando nas
   * configurações salvas em memória através do id da conexão ou da tupla (host, port, user, database).
   */
  public resolveConnectionConfig(config: DatabaseConnectionConfig): DatabaseConnectionConfig {
    if (config.password || !this.configService) {
      return config;
    }
    const settings = this.configService.getSettings();
    const saved = settings.databaseConnections?.find(
      (c) =>
        (config.id && c.id === config.id) ||
        (c.host === config.host &&
          c.port === config.port &&
          c.user === config.user &&
          c.database === config.database)
    );
    if (saved?.password) {
      return { ...config, password: saved.password };
    }
    return config;
  }

  // Guarda a Promise da conexão (não o valor já resolvido) para que duas chamadas
  // concorrentes com a mesma cacheKey (ex: testConnection + listTables disparados
  // juntos pela UI) aguardem a MESMA conexão em vez de cada uma abrir a sua e uma
  // sobrescrever silenciosamente a outra no Map (vazando um handle nunca fechado).
  private connCache = new Map<string, Promise<CachedConnection>>();
  private static readonly IDLE_MS = 30000;

  private cacheKey(config: DatabaseConnectionConfig): string {
    return `${config.type}|${config.host}|${config.port}|${config.database}|${config.user}`;
  }

  /**
   * Executa fn contra uma conexão do banco. Quando reuse=true, mantém a conexão
   * aberta e a compartilha entre chamadas subsequentes com a mesma config
   * (evita reabrir handshake em test -> listTables -> executeQuery), fechando-a
   * após IDLE_MS sem uso ou imediatamente em caso de erro.
   *
   * As operações na mesma conexão física são enfileiradas sequencialmente para
   * impedir colisões de pacotes de rede e desincronização de socket nos drivers
   * (especialmente Oracle thin e PostgreSQL client).
   */
  private async withConnection<T, R>(
    config: DatabaseConnectionConfig,
    getConn: () => Promise<T>,
    closeConn: (conn: T) => Promise<void>,
    fn: (conn: T) => Promise<R>,
    reuse = false
  ): Promise<R> {
    config = this.resolveConnectionConfig(config);
    if (!reuse) {
      const conn = await getConn();
      try {
        return await fn(conn);
      } finally {
        await closeConn(conn).catch(() => {});
      }
    }

    const key = this.cacheKey(config);
    let cachedPromise = this.connCache.get(key);
    if (!cachedPromise) {
      cachedPromise = getConn().then((conn) => ({
        conn,
        close: closeConn as (c: any) => Promise<void>,
        timer: undefined as any,
        queue: Promise.resolve()
      }));
      // Se a conexão falhar, remove a entrada para permitir uma nova tentativa
      // (sem consumir a rejeição de quem está aguardando `cachedPromise` abaixo).
      cachedPromise.catch(() => this.connCache.delete(key));
      this.connCache.set(key, cachedPromise);
    }

    const cached = await cachedPromise;
    clearTimeout(cached.timer);
    cached.timer = setTimeout(() => {
      this.connCache.delete(key);
      cached.close(cached.conn).catch(() => {});
    }, DatabaseService.IDLE_MS);

    const runInQueue = () => {
      const next = cached.queue.then(() => fn(cached.conn as T));
      cached.queue = next.catch(() => {});
      return next;
    };

    try {
      return await runInQueue();
    } catch (err) {
      clearTimeout(cached.timer);
      this.connCache.delete(key);
      await closeConn(cached.conn as T).catch(() => {});
      throw err;
    }
  }
  /**
   * Testa a conectividade com o banco de dados especificado.
   */
  public async testConnection(
    config: DatabaseConnectionConfig
  ): Promise<{ success: boolean; message: string; version?: string }> {
    config = this.resolveConnectionConfig(config);
    try {
      if (!config.host || !config.port || !config.user) {
        return {
          success: false,
          message: 'Configuração incompleta: informe ao menos Host, Porta e Usuário.'
        };
      }

      switch (config.type) {
        case 'postgres':
          return await this.testPostgres(config);
        case 'mysql':
          return await this.testMysql(config);
        case 'oracle':
          return await this.testOracle(config);
        default:
          return { success: false, message: `Tipo de banco '${(config as any).type}' não suportado.` };
      }
    } catch (err: any) {
      return {
        success: false,
        message: await this.formatErrorMessage(err, config)
      };
    }
  }

  /**
   * Executa uma consulta (SELECT) ou comando de modificação (UPDATE, INSERT, DELETE, etc.).
   */
  public async executeQuery(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows = 200,
    binds?: Record<string, any>
  ): Promise<QueryResult> {
    config = this.resolveConnectionConfig(config);
    maxRows = Number.isFinite(maxRows) && maxRows > 0 ? Math.floor(maxRows) : 200;
    const startTime = Date.now();
    const cleanSql = sql.trim().replace(/;+\s*$/, '');

    if (!cleanSql) {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        isQuery: false,
        error: 'O comando SQL não pode estar vazio.'
      };
    }

    try {
      switch (config.type) {
        case 'postgres':
          return await this.executePostgres(config, cleanSql, maxRows, startTime, binds);
        case 'mysql':
          return await this.executeMysql(config, cleanSql, maxRows, startTime, binds);
        case 'oracle':
          return await this.executeOracle(config, cleanSql, maxRows, startTime, binds);
        default:
          throw new Error(`Tipo de banco '${config.type}' não suportado.`);
      }
    } catch (err: any) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs,
        isQuery: false,
        error: await this.formatErrorMessage(err, config)
      };
    }
  }

  /**
   * Monta um erro padronizado de QueryResult para as operações de mutação de linha
   * (insertRow/updateRow/deleteRow) quando a validação falha antes de tocar o banco.
   */
  private mutationValidationError(error: string): QueryResult {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      isQuery: false,
      error
    };
  }

  /**
   * Monta a cláusula WHERE (com binds posicionais :p0, :p1...) a partir de um objeto de
   * condições de igualdade, tratando valores null como "IS NULL" (já que "coluna = NULL"
   * nunca casa em SQL). `startIndex` evita colisão de nomes de bind quando reaproveitado
   * junto de um SET (ver updateRow).
   */
  private buildEqualityWhereClause(
    where: Record<string, any>,
    binds: Record<string, any>,
    startIndex: number
  ): { clause: string; nextIndex: number } {
    let idx = startIndex;
    const parts = Object.entries(where).map(([col, val]) => {
      if (val === null || val === undefined) {
        return `${col} IS NULL`;
      }
      const key = `p${idx++}`;
      binds[key] = val;
      return `${col} = :${key}`;
    });
    return { clause: parts.join(' AND '), nextIndex: idx };
  }

  /**
   * Insere uma linha em `tableName` a partir do editor de dados do DB Studio. Nomes de tabela
   * e coluna vêm da UI (clique numa tabela do schema), por isso são revalidados aqui como
   * identificadores SQL antes de compor o comando — nunca confiar apenas na validação do
   * renderer.
   */
  public async insertRow(
    config: DatabaseConnectionConfig,
    tableName: string,
    values: Record<string, any>
  ): Promise<QueryResult> {
    if (!isValidSqlTableName(tableName)) {
      return this.mutationValidationError(`Nome de tabela inválido: "${tableName}".`);
    }
    const columns = Object.keys(values);
    if (columns.length === 0) {
      return this.mutationValidationError('Informe ao menos uma coluna para inserir a linha.');
    }
    for (const col of columns) {
      if (!isValidSqlIdentifier(col)) {
        return this.mutationValidationError(`Nome de coluna inválido: "${col}".`);
      }
    }

    const binds: Record<string, any> = {};
    const placeholders = columns.map((col, idx) => {
      binds[`p${idx}`] = values[col];
      return `:p${idx}`;
    });

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    return this.executeQuery(config, sql, 1, binds);
  }

  /**
   * Atualiza colunas de uma única linha em `tableName`, identificada por `where` (chave
   * primária, quando existe; todas as colunas da linha original, como fallback). Bloqueia
   * update sem nenhuma condição — nunca deixa cair num UPDATE de tabela inteira por engano.
   */
  public async updateRow(
    config: DatabaseConnectionConfig,
    tableName: string,
    changes: Record<string, any>,
    where: Record<string, any>
  ): Promise<QueryResult> {
    if (!isValidSqlTableName(tableName)) {
      return this.mutationValidationError(`Nome de tabela inválido: "${tableName}".`);
    }
    const setColumns = Object.keys(changes);
    const whereColumns = Object.keys(where);
    if (setColumns.length === 0) {
      return this.mutationValidationError('Nenhuma alteração informada para atualizar.');
    }
    if (whereColumns.length === 0) {
      return this.mutationValidationError('Condição WHERE vazia — atualização bloqueada por segurança.');
    }
    for (const col of [...setColumns, ...whereColumns]) {
      if (!isValidSqlIdentifier(col)) {
        return this.mutationValidationError(`Nome de coluna inválido: "${col}".`);
      }
    }

    const binds: Record<string, any> = {};
    let idx = 0;
    const setClause = setColumns
      .map((col) => {
        const key = `p${idx++}`;
        binds[key] = changes[col];
        return `${col} = :${key}`;
      })
      .join(', ');
    const { clause: whereClause } = this.buildEqualityWhereClause(where, binds, idx);

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
    return this.executeQuery(config, sql, 1, binds);
  }

  /**
   * Exclui uma única linha de `tableName`, identificada por `where`. Mesma trava de segurança
   * do updateRow: WHERE vazio é rejeitado antes de montar o SQL.
   */
  public async deleteRow(
    config: DatabaseConnectionConfig,
    tableName: string,
    where: Record<string, any>
  ): Promise<QueryResult> {
    if (!isValidSqlTableName(tableName)) {
      return this.mutationValidationError(`Nome de tabela inválido: "${tableName}".`);
    }
    const whereColumns = Object.keys(where);
    if (whereColumns.length === 0) {
      return this.mutationValidationError('Condição WHERE vazia — exclusão bloqueada por segurança.');
    }
    for (const col of whereColumns) {
      if (!isValidSqlIdentifier(col)) {
        return this.mutationValidationError(`Nome de coluna inválido: "${col}".`);
      }
    }

    const binds: Record<string, any> = {};
    const { clause: whereClause } = this.buildEqualityWhereClause(where, binds, 0);

    const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    return this.executeQuery(config, sql, 1, binds);
  }

  /**
   * Realiza interpolação segura de parâmetros e variáveis (:VAR, &VAR, &&VAR, @VAR, ${VAR}, #{VAR})
   * para bancos que não usam objeto nativo (ex: MySQL/PG) ou para variáveis de substituição no Oracle.
   */
  public interpolateBinds(sql: string, binds?: Record<string, any>): string {
    if (!binds || Object.keys(binds).length === 0) return sql;

    const literalsMap: Record<string, string> = {};
    for (const [key, rawVal] of Object.entries(binds)) {
      let replacement: string;
      if (rawVal === null || rawVal === undefined) {
        replacement = 'NULL';
      } else if (typeof rawVal === 'number') {
        replacement = String(rawVal);
      } else if (typeof rawVal === 'boolean') {
        replacement = rawVal ? 'TRUE' : 'FALSE';
      } else if (rawVal instanceof Date) {
        replacement = `'${rawVal.toISOString()}'`;
      } else {
        const str = String(rawVal);
        if (str.toUpperCase() === 'NULL') {
          replacement = 'NULL';
        } else {
          replacement = `'${str.replace(/'/g, "''")}'`;
        }
      }
      literalsMap[key.toUpperCase()] = replacement;
    }

    const tokenRegex = /(\/\*[\s\S]*?\*\/|--[^\r\n]*|'(?:''|[^'])*'|(?<!:):(?!=)[a-zA-Z_][a-zA-Z0-9_]*\b|&&[a-zA-Z_][a-zA-Z0-9_]*\b|(?<!&)&(?!=)[a-zA-Z_][a-zA-Z0-9_]*\b|@[a-zA-Z_][a-zA-Z0-9_]*\b|\$\{[a-zA-Z_][a-zA-Z0-9_]*\}|#\{[a-zA-Z_][a-zA-Z0-9_]*\})/gi;
    return sql.replace(tokenRegex, (match) => {
      if (match.startsWith('/*') || match.startsWith('--') || match.startsWith("'")) {
        return match;
      }

      let varName = '';
      if (match.startsWith('&&')) {
        varName = match.slice(2);
      } else if (match.startsWith('&') || match.startsWith(':') || match.startsWith('@')) {
        varName = match.slice(1);
      } else if ((match.startsWith('${') || match.startsWith('#{')) && match.endsWith('}')) {
        varName = match.slice(2, -1);
      }

      const upper = varName.toUpperCase().trim();
      if (upper && upper in literalsMap) {
        return literalsMap[upper];
      }

      return match;
    });
  }

  /**
   * Lista as tabelas disponíveis no schema/banco de dados conectado.
   */
  public async listTables(config: DatabaseConnectionConfig): Promise<string[]> {
    try {
      let query = '';
      if (config.type === 'oracle') {
        query = 'SELECT table_name FROM user_tables ORDER BY table_name';
      } else if (config.type === 'postgres') {
        query =
          "SELECT table_schema || '.' || table_name AS table_name FROM information_schema.tables " +
          "WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name";
      } else if (config.type === 'mysql') {
        query = 'SHOW TABLES';
      }

      const res = await this.executeQuery(config, query, MAX_LISTED_TABLES);
      if (!res.success || !res.rows) return [];

      return res.rows.map((row) => {
        const firstKey = Object.keys(row)[0];
        return String(row[firstKey]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Lista as colunas e tipos de dados de uma tabela específica.
   */
  public async getTableColumns(
    config: DatabaseConnectionConfig,
    tableName: string
  ): Promise<TableColumnInfo[]> {
    const cleanTable = tableName.trim().replace(/[^a-zA-Z0-9_$.]/g, '');
    if (!cleanTable) return [];

    try {
      if (config.type === 'oracle') {
        const upperTable = cleanTable.toUpperCase();
        const query = `
          SELECT 
            c.COLUMN_NAME, 
            c.DATA_TYPE, 
            c.DATA_LENGTH, 
            c.DATA_PRECISION, 
            c.DATA_SCALE, 
            c.NULLABLE,
            CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'Y' ELSE 'N' END AS IS_PK
          FROM USER_TAB_COLS c
          LEFT JOIN (
            SELECT cc.COLUMN_NAME
            FROM USER_CONSTRAINTS uc
            JOIN USER_CONS_COLUMNS cc ON uc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
            WHERE uc.CONSTRAINT_TYPE = 'P' 
              AND uc.TABLE_NAME = '${upperTable}'
          ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
          WHERE c.TABLE_NAME = '${upperTable}'
            AND c.HIDDEN_COLUMN = 'NO'
          ORDER BY c.COLUMN_ID
        `;
        const res = await this.executeQuery(config, query, 300);
        if (!res.success || !res.rows) return [];

        return res.rows.map((r: any) => {
          let typeStr = String(r.DATA_TYPE || '');
          if (r.DATA_PRECISION) {
            typeStr += `(${r.DATA_PRECISION}${r.DATA_SCALE ? ',' + r.DATA_SCALE : ''})`;
          } else if (r.DATA_LENGTH && ['VARCHAR2', 'CHAR', 'RAW'].includes(r.DATA_TYPE)) {
            typeStr += `(${r.DATA_LENGTH})`;
          }
          return {
            name: String(r.COLUMN_NAME || ''),
            type: typeStr,
            nullable: r.NULLABLE === 'Y',
            isPrimaryKey: r.IS_PK === 'Y',
            length: r.DATA_LENGTH
          };
        });
      } else if (config.type === 'postgres') {
        const dotIdx = cleanTable.lastIndexOf('.');
        const schemaPart = dotIdx >= 0 ? cleanTable.slice(0, dotIdx) : 'public';
        const tablePart = dotIdx >= 0 ? cleanTable.slice(dotIdx + 1) : cleanTable;
        const query = `
          SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.character_maximum_length,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_pk
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.column_name, ku.table_name, ku.table_schema
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
              ON tc.constraint_name = ku.constraint_name AND tc.table_schema = ku.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
          ) pk ON c.table_name = pk.table_name AND c.table_schema = pk.table_schema AND c.column_name = pk.column_name
          WHERE LOWER(c.table_name) = LOWER('${tablePart}') AND LOWER(c.table_schema) = LOWER('${schemaPart}')
          ORDER BY c.ordinal_position
        `;
        const res = await this.executeQuery(config, query, 300);
        if (!res.success || !res.rows) return [];

        return res.rows.map((r: any) => ({
          name: String(r.column_name || ''),
          type: r.character_maximum_length ? `${r.data_type}(${r.character_maximum_length})` : String(r.data_type || ''),
          nullable: r.is_nullable === 'YES',
          isPrimaryKey: r.is_pk === 'YES',
          length: r.character_maximum_length,
          defaultValue: r.column_default ? String(r.column_default) : undefined
        }));
      } else if (config.type === 'mysql') {
        const query = `SHOW FULL COLUMNS FROM \`${cleanTable}\``;
        const res = await this.executeQuery(config, query, 300);
        if (!res.success || !res.rows) return [];

        return res.rows.map((r: any) => ({
          name: String(r.Field || Object.values(r)[0] || ''),
          type: String(r.Type || ''),
          nullable: r.Null === 'YES',
          isPrimaryKey: r.Key === 'PRI',
          defaultValue: r.Default !== null && r.Default !== undefined ? String(r.Default) : undefined
        }));
      }
      return [];
    } catch (err) {
      console.warn(`[DatabaseService] Erro ao obter colunas da tabela ${cleanTable}:`, err);
      return [];
    }
  }

  /**
   * Obtém o plano de execução (Explain Plan) para a instrução SQL informada.
   */
  public async explainPlan(
    config: DatabaseConnectionConfig,
    sql: string
  ): Promise<ExplainPlanResult> {
    config = this.resolveConnectionConfig(config);
    const startTime = Date.now();
    const cleanSql = sql.trim().replace(/;+$/, '');

    if (!cleanSql) {
      return {
        success: false,
        planLines: [],
        executionTimeMs: 0,
        error: 'Instrução SQL vazia para Explain Plan.'
      };
    }

    try {
      if (config.type === 'oracle') {
        return await this.withConnection(
          config,
          () => this.getOracleConnection(config),
          ({ conn }) => conn.close(),
          async ({ conn, oracledb }) => {
            // 1. Gera o plano na sessão da conexão atual
            await conn.execute(`EXPLAIN PLAN FOR ${cleanSql}`, [], { autoCommit: true });

            // 2. Consulta a saída do DBMS_XPLAN na mesma sessão
            const displayRes = await conn.execute(
              "SELECT PLAN_TABLE_OUTPUT FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', NULL, 'TYPICAL'))",
              [],
              {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                maxRows: 500
              }
            );

            const lines = (displayRes.rows as any[])?.map((r) => String(r.PLAN_TABLE_OUTPUT || Object.values(r)[0] || '')) || [];
            return {
              success: true,
              planLines: lines,
              executionTimeMs: Date.now() - startTime
            };
          },
          true
        );
      } else if (config.type === 'postgres') {
        const res = await this.executeQuery(config, `EXPLAIN (FORMAT TEXT) ${cleanSql}`, 500);
        if (!res.success || !res.rows) {
          return {
            success: false,
            planLines: [],
            executionTimeMs: Date.now() - startTime,
            error: res.error || 'Falha ao executar EXPLAIN no PostgreSQL.'
          };
        }
        const lines = res.rows.map((r) => String(r['QUERY PLAN'] || Object.values(r)[0] || ''));
        return {
          success: true,
          planLines: lines,
          executionTimeMs: Date.now() - startTime
        };
      } else if (config.type === 'mysql') {
        const res = await this.executeQuery(config, `EXPLAIN ${cleanSql}`, 500);
        if (!res.success || !res.rows) {
          return {
            success: false,
            planLines: [],
            executionTimeMs: Date.now() - startTime,
            error: res.error || 'Falha ao executar EXPLAIN no MySQL.'
          };
        }
        // Formata as colunas em formato tabular legível
        const lines = res.rows.map(
          (r, idx) =>
            `#${idx + 1} | id: ${r.id ?? '-'} | select_type: ${r.select_type ?? '-'} | table: ${r.table ?? '-'} | type: ${r.type ?? '-'} | possible_keys: ${r.possible_keys ?? '-'} | key: ${r.key ?? '-'} | rows: ${r.rows ?? '-'}`
        );
        return {
          success: true,
          planLines: lines,
          executionTimeMs: Date.now() - startTime
        };
      }

      return {
        success: false,
        planLines: [],
        executionTimeMs: 0,
        error: `Tipo de banco '${config.type}' não suporta Explain Plan.`
      };
    } catch (err: any) {
      return {
        success: false,
        planLines: [],
        executionTimeMs: Date.now() - startTime,
        error: await this.formatErrorMessage(err, config)
      };
    }
  }

  /**
   * Statement Tracer: lista as sessões conectadas ao Oracle e a instrução SQL atual/última
   * executada por cada uma (join de v$session com v$sql via SQL_ID/PREV_SQL_ID). Serve para
   * responder "quem está rodando o quê agora" quando vários apps compartilham o mesmo banco.
   */
  public async getOracleActiveSessions(
    config: DatabaseConnectionConfig,
    filter?: OracleTracerFilter
  ): Promise<OracleActiveSessionsResult> {
    const startTime = Date.now();
    if (config.type !== 'oracle') {
      return {
        success: false,
        sessions: [],
        executionTimeMs: 0,
        error: 'Statement Tracer disponível apenas para conexões Oracle.'
      };
    }

    const { sql, binds } = buildActiveSessionsQuery(filter);
    const res = await this.executeQuery(config, sql, filter?.limit ?? 200, binds);
    if (!res.success || !res.rows) {
      return {
        success: false,
        sessions: [],
        executionTimeMs: Date.now() - startTime,
        error: res.error || 'Falha ao consultar sessões ativas no Oracle.'
      };
    }

    const sessions = res.rows.map(mapActiveSessionRow);

    // Enriquecer com binds de v$sql_bind_capture para as sessões que possuem SQL_ID
    const sqlIds = Array.from(new Set(sessions.map((s) => s.sqlId).filter((id): id is string => Boolean(id))));
    if (sqlIds.length > 0) {
      try {
        const bindMap = await this.getOracleBindsForSqlIds(config, sqlIds.slice(0, 50));
        for (const session of sessions) {
          if (!session.sqlId) continue;
          const sessionBinds = bindMap.get(session.sqlId);
          if (sessionBinds && sessionBinds.length > 0) {
            session.binds = sessionBinds;
            if (session.sqlText) {
              session.interpolatedSql = interpolateOracleSqlWithBinds(session.sqlText, sessionBinds);
            }
          }
        }
      } catch (err) {
        console.warn('[DatabaseService] Falha ao enriquecer sessões com binds:', err);
      }
    }

    return {
      success: true,
      sessions,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Statement Tracer: lista as instruções SQL mais recentes no cursor cache do Oracle
   * (v$sql), mostrando o que rodou no banco mesmo que a sessão que executou já tenha
   * encerrado — útil para correlacionar "qual query rodou quando cliquei nesse botão".
   */
  public async getOracleRecentStatements(
    config: DatabaseConnectionConfig,
    filter?: OracleTracerFilter
  ): Promise<OracleRecentStatementsResult> {
    const startTime = Date.now();
    if (config.type !== 'oracle') {
      return {
        success: false,
        statements: [],
        executionTimeMs: 0,
        error: 'Statement Tracer disponível apenas para conexões Oracle.'
      };
    }

    const { sql, binds } = buildRecentStatementsQuery(filter);
    const res = await this.executeQuery(config, sql, filter?.limit ?? 200, binds);
    if (!res.success || !res.rows) {
      return {
        success: false,
        statements: [],
        executionTimeMs: Date.now() - startTime,
        error: res.error || 'Falha ao consultar SQL recente no Oracle.'
      };
    }

    const statements = res.rows.map(mapRecentStatementRow);

    // Enriquecer com binds de v$sql_bind_capture para os SQL_IDs encontrados
    const sqlIds = Array.from(new Set(statements.map((s) => s.sqlId).filter(Boolean)));
    if (sqlIds.length > 0) {
      try {
        const bindMap = await this.getOracleBindsForSqlIds(config, sqlIds.slice(0, 50));
        for (const stmt of statements) {
          const stmtBinds = bindMap.get(stmt.sqlId);
          if (stmtBinds && stmtBinds.length > 0) {
            stmt.binds = stmtBinds;
            stmt.interpolatedSql = interpolateOracleSqlWithBinds(stmt.sqlText, stmtBinds);
          }
        }
      } catch (err) {
        console.warn('[DatabaseService] Falha ao enriquecer statements com binds:', err);
      }
    }

    return {
      success: true,
      statements,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Consulta os parâmetros de bind registrados na view v$sql_bind_capture para uma lista de SQL_IDs.
   */
  public async getOracleBindsForSqlIds(
    config: DatabaseConnectionConfig,
    sqlIds: string[]
  ): Promise<Map<string, OracleCapturedBind[]>> {
    if (config.type !== 'oracle' || !sqlIds || sqlIds.length === 0) {
      return new Map();
    }

    try {
      const { sql, binds } = buildBindCaptureQuery(sqlIds);
      const res = await this.executeQuery(config, sql, 2000, binds);
      if (!res.success || !res.rows) {
        return new Map();
      }
      return groupCapturedBindsBySqlId(res.rows);
    } catch (err) {
      console.warn('[DatabaseService] Falha ao consultar v$sql_bind_capture:', err);
      return new Map();
    }
  }

  /**
   * Consulta os parâmetros de bind (v$sql_bind_capture) para um SQL_ID específico e gera o SQL interpolado.
   */
  public async getOracleStatementBinds(
    config: DatabaseConnectionConfig,
    sqlId: string,
    sqlText?: string
  ): Promise<OracleStatementBindsResult> {
    const startTime = Date.now();
    if (config.type !== 'oracle') {
      return {
        success: false,
        sqlId,
        binds: [],
        executionTimeMs: 0,
        error: 'Statement Tracer disponível apenas para conexões Oracle.'
      };
    }

    try {
      const bindMap = await this.getOracleBindsForSqlIds(config, [sqlId]);
      const binds = bindMap.get(sqlId) || [];
      const interpolatedSql = sqlText && binds.length > 0 ? interpolateOracleSqlWithBinds(sqlText, binds) : undefined;

      return {
        success: true,
        sqlId,
        binds,
        interpolatedSql,
        executionTimeMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        sqlId,
        binds: [],
        executionTimeMs: Date.now() - startTime,
        error: err?.message || 'Falha ao consultar parâmetros de bind no Oracle.'
      };
    }
  }

  // =========================================================================
  // Implementação PostgreSQL
  // =========================================================================

  private async getPgClient(config: DatabaseConnectionConfig) {
    let pgModule: any;
    try {
      pgModule = await import('pg');
    } catch {
      throw new Error("Driver do PostgreSQL não instalado. Execute: npm install pg @types/pg");
    }

    const { Client } = pgModule.default || pgModule;
    const client = new Client({
      host: config.host,
      port: config.port || 5432,
      database: config.database || 'postgres',
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 7000
    });

    await client.connect();
    return client;
  }

  private async testPostgres(config: DatabaseConnectionConfig) {
    return this.withConnection(
      config,
      () => this.getPgClient(config),
      (client) => client.end(),
      async (client) => {
        const res = await client.query('SELECT version();');
        const version = res.rows[0]?.version || 'PostgreSQL Conectado com Sucesso';
        return { success: true, message: 'Conexão bem-sucedida ao PostgreSQL!', version };
      }
    );
  }

  private async executePostgres(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows: number,
    startTime: number,
    binds?: Record<string, any>
  ): Promise<QueryResult> {
    return this.withConnection(
      config,
      () => this.getPgClient(config),
      (client) => client.end(),
      async (client) => {
        const finalSql = this.interpolateBinds(sql, binds);
        const res = await client.query(finalSql);
        const executionTimeMs = Date.now() - startTime;

        if (Array.isArray(res)) {
          // Múltiplos comandos
          const last = res[res.length - 1];
          const isQuery = Boolean(last.fields && last.fields.length > 0);
          const columns = isQuery ? last.fields.map((f: any) => f.name) : [];
          const rawRows = isQuery ? (last.rows || []).slice(0, maxRows) : [];
          return {
            success: true,
            columns,
            rows: sanitizeRows(rawRows, columns),
            rowCount: isQuery ? (last.rows ? last.rows.length : 0) : 0,
            affectedRows: !isQuery ? last.rowCount ?? undefined : undefined,
            executionTimeMs,
            isQuery
          };
        }

        const isQuery = Boolean(res.fields && res.fields.length > 0);
        const columns = isQuery ? res.fields.map((f: any) => f.name) : [];
        const rawRows = isQuery ? (res.rows || []).slice(0, maxRows) : [];
        return {
          success: true,
          columns,
          rows: sanitizeRows(rawRows, columns),
          rowCount: isQuery ? (res.rows ? res.rows.length : 0) : 0,
          affectedRows: !isQuery ? res.rowCount ?? undefined : undefined,
          executionTimeMs,
          isQuery
        };
      },
      true
    );
  }

  // =========================================================================
  // Implementação MySQL
  // =========================================================================

  private async getMysqlConnection(config: DatabaseConnectionConfig) {
    let mysqlModule: any;
    try {
      mysqlModule = await import('mysql2/promise');
    } catch {
      throw new Error("Driver do MySQL não instalado. Execute: npm install mysql2");
    }

    const mysql = mysqlModule.default || mysqlModule;
    return await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 7000
    });
  }

  private async testMysql(config: DatabaseConnectionConfig) {
    return this.withConnection(
      config,
      () => this.getMysqlConnection(config),
      (conn) => conn.end(),
      async (conn) => {
        const [rows] = await conn.query('SELECT VERSION() as version;');
        const version = (rows as any)?.[0]?.version || 'MySQL Conectado com Sucesso';
        return { success: true, message: 'Conexão bem-sucedida ao MySQL!', version: `MySQL ${version}` };
      }
    );
  }

  private async executeMysql(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows: number,
    startTime: number,
    binds?: Record<string, any>
  ): Promise<QueryResult> {
    return this.withConnection(
      config,
      () => this.getMysqlConnection(config),
      (conn) => conn.end(),
      async (conn) => {
        const finalSql = this.interpolateBinds(sql, binds);
        const [result, fields] = await conn.query(finalSql);
        const executionTimeMs = Date.now() - startTime;

        if (Array.isArray(result) && fields) {
          // É um SELECT / resultado com colunas
          const columns = (fields as any[]).map((f) => f.name);
          const rawRows = (result as Record<string, any>[]).slice(0, maxRows);
          return {
            success: true,
            columns,
            rows: sanitizeRows(rawRows, columns),
            rowCount: result.length,
            executionTimeMs,
            isQuery: true
          };
        }

        // É um UPDATE / INSERT / DELETE (OkPacket)
        const affectedRows = (result as any)?.affectedRows ?? 0;
        return {
          success: true,
          columns: [],
          rows: [],
          rowCount: 0,
          affectedRows,
          executionTimeMs,
          isQuery: false
        };
      },
      true
    );
  }

  // =========================================================================
  // Implementação Oracle (Thin Mode puro JavaScript ou Thick Mode com Instant Client)
  // =========================================================================

  private static oracleClientInitialized = false;

  private getOracleBinaryDir(): string | undefined {
    try {
      const candidates = [
        path.join(process.cwd(), 'node_modules', 'oracledb', 'build', 'Release'),
        path.join(__dirname, '..', '..', '..', 'node_modules', 'oracledb', 'build', 'Release'),
        path.join(__dirname, '..', 'node_modules', 'oracledb', 'build', 'Release')
      ];
      if (typeof (process as any).resourcesPath === 'string') {
        candidates.push(
          path.join((process as any).resourcesPath, 'app.asar.unpacked', 'node_modules', 'oracledb', 'build', 'Release'),
          path.join((process as any).resourcesPath, 'node_modules', 'oracledb', 'build', 'Release')
        );
      }
      return candidates.find((dir) => fs.existsSync(dir));
    } catch {
      return undefined;
    }
  }

  private initOracleThickClient(oracledb: any, libDir?: string): void {
    if (DatabaseService.oracleClientInitialized) return;
    try {
      const options: { libDir?: string; binaryDir?: string } = {};
      const trimmed = libDir?.trim();
      if (trimmed) {
        options.libDir = trimmed;
      }
      const binaryDir = this.getOracleBinaryDir();
      if (binaryDir) {
        options.binaryDir = binaryDir;
      }
      oracledb.initOracleClient(options);
      DatabaseService.oracleClientInitialized = true;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('NJS-009') || msg.includes('already been called')) {
        DatabaseService.oracleClientInitialized = true;
        return;
      }
      throw err;
    }
  }

  private async getOracleConnection(config: DatabaseConnectionConfig) {
    let oracleModule: any;
    try {
      // Prioriza createRequire para módulos nativos C++ em ambiente ESM
      const req = createRequire(import.meta.url);
      oracleModule = req('oracledb');
    } catch {
      try {
        oracleModule = await import('oracledb');
      } catch {
        throw new Error("Driver do Oracle não instalado. Execute: npm install oracledb");
      }
    }

    const oracledb = oracleModule.default || oracleModule;

    // Configura tratamento nativo de LOBs no Oracle para carregar como strings/buffers em vez de streams
    try {
      if (oracledb.CLOB && (!oracledb.fetchAsString || !oracledb.fetchAsString.includes(oracledb.CLOB))) {
        oracledb.fetchAsString = [oracledb.CLOB];
      }
      if (oracledb.BLOB && (!oracledb.fetchAsBuffer || !oracledb.fetchAsBuffer.includes(oracledb.BLOB))) {
        oracledb.fetchAsBuffer = [oracledb.BLOB];
      }
    } catch {
      // Ignora caso a versão não suporte
    }

    // Se o usuário solicitou Thick Mode ou informou o caminho do Instant Client, inicializa antes de conectar
    if (config.oracleThickMode || config.oracleClientPath) {
      this.initOracleThickClient(oracledb, config.oracleClientPath);
    }

    // Montar string de conexão Oracle
    // Para Service Name: host:port/serviceName
    // Para SID: host:port:SID
    const separator = config.oracleMode === 'sid' ? ':' : '/';
    const connectString = `${config.host}:${config.port || 1521}${separator}${config.database}`;

    try {
      const conn = await oracledb.getConnection({
        user: config.user,
        password: config.password,
        connectString
      });
      return { conn, oracledb };
    } catch (err: any) {
      const msg = err?.message || String(err);
      // Se for NJS-138 (Thin mode rejeitado pelo Oracle 11g/anterior) e o cliente ainda não foi inicializado em Thick mode:
      // tenta automaticamente inicializar Thick Mode caso o Instant Client esteja disponível no PATH do sistema.
      if (msg.includes('NJS-138') && !DatabaseService.oracleClientInitialized) {
        try {
          this.initOracleThickClient(oracledb, config.oracleClientPath);
          const conn = await oracledb.getConnection({
            user: config.user,
            password: config.password,
            connectString
          });
          return { conn, oracledb };
        } catch {
          // Se a tentativa de inicializar Thick falhar, relança o erro original NJS-138
          throw err;
        }
      }
      throw err;
    }
  }

  private async testOracle(config: DatabaseConnectionConfig) {
    return this.withConnection(
      config,
      () => this.getOracleConnection(config),
      ({ conn }) => conn.close(),
      async ({ conn, oracledb }) => {
        try {
          const result = await conn.execute('SELECT * FROM v$version WHERE banner LIKE \'Oracle%\'', [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT
          });
          const banner = (result.rows as any[])?.[0]?.BANNER || 
            (DatabaseService.oracleClientInitialized 
              ? 'Oracle Database Conectado (Thick Mode)' 
              : 'Oracle Database Conectado (Thin Mode)');
          return { success: true, message: 'Conexão bem-sucedida ao Oracle!', version: banner };
        } catch {
          // Fallback caso usuário não tenha permissão no v$version
          return { success: true, message: 'Conexão bem-sucedida ao Oracle Database!' };
        }
      }
    );
  }

  private async executeOracle(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows: number,
    startTime: number,
    binds?: Record<string, any>
  ): Promise<QueryResult> {
    return this.withConnection(
      config,
      () => this.getOracleConnection(config),
      ({ conn }) => conn.close(),
      async ({ conn, oracledb }) => {
        const cleanSql = sql.trim().replace(/;+\s*$/, '');
        const sqlWithoutComments = cleanSql.replace(/^(\s*(--[^\r\n]*|\/\*[\s\S]*?\*\/)\s*)+/i, '');
        const isSelect = /^(SELECT|WITH)\b/i.test(sqlWithoutComments);

        let sqlToExecute = cleanSql;
        let bindParams: any = [];

        if (binds && typeof binds === 'object' && Object.keys(binds).length > 0) {
          const hasSubstitutionVars = /(?<!&)&(?!=)[a-zA-Z_]|&&[a-zA-Z_]|@[a-zA-Z_]|\$\{[a-zA-Z_]|#\{[a-zA-Z_]/.test(cleanSql);
          if (hasSubstitutionVars) {
            sqlToExecute = this.interpolateBinds(cleanSql, binds);
            bindParams = [];
          } else {
            bindParams = binds;
          }
        }

        const execOptions: any = {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          autoCommit: !isSelect,
          maxRows: isSelect ? maxRows : undefined
        };
        // callTimeout (ms) evita travamento de socket em consultas demoradas
        execOptions.callTimeout = 60000;

        const result = await conn.execute(sqlToExecute, bindParams, execOptions);

        const executionTimeMs = Date.now() - startTime;

        if (result.rows && result.metaData) {
          const columns = result.metaData.map((m: any) => m.name);
          const rawRows = (result.rows as Record<string, any>[]).slice(0, maxRows);
          return {
            success: true,
            columns,
            rows: sanitizeRows(rawRows, columns),
            rowCount: result.rows.length,
            executionTimeMs,
            isQuery: true
          };
        }

        return {
          success: true,
          columns: [],
          rows: [],
          rowCount: 0,
          affectedRows: result.rowsAffected ?? 0,
          executionTimeMs,
          isQuery: false
        };
      },
      true
    );
  }

  /**
   * Quando a falha de autenticação ocorre contra um host loopback, verifica se a porta já
   * está ocupada por outro processo local — sintoma de um túnel SSH (-L) que não conseguiu
   * abrir o bind e a conexão caiu silenciosamente num serviço local diferente do pretendido.
   */
  private async describeLocalPortConflict(config: DatabaseConnectionConfig): Promise<string> {
    const loopbackHosts = ['localhost', '127.0.0.1', '::1'];
    if (!loopbackHosts.includes((config.host || '').toLowerCase())) return '';

    const listener = await getListeningPid(config.port);
    if (!listener) return '';

    const expectedProcessNames: Record<DatabaseConnectionConfig['type'], string[]> = {
      postgres: ['postgres'],
      mysql: ['mysqld', 'mysql'],
      oracle: ['oracle', 'tnslsnr']
    };
    const name = listener.processName.toLowerCase();
    const looksLikeExpectedEngine = (expectedProcessNames[config.type] || []).some((keyword) =>
      name.includes(keyword)
    );
    if (looksLikeExpectedEngine) return '';

    return ` Atenção: a porta ${config.port} em ${config.host} já está em uso pelo processo "${listener.processName}" (PID ${listener.pid}) nesta máquina, que não parece ser um ${config.type.toUpperCase()} — confirme que não é outro banco de dados antes de revisar usuário/senha (sintoma comum de túnel SSH -L que não conseguiu abrir a porta local e caiu num serviço já existente ali).`;
  }

  private async formatErrorMessage(err: any, config: DatabaseConnectionConfig): Promise<string> {
    const type = config.type;
    const msg = err?.message || String(err);
    if (msg.includes('ORA-01008')) {
      return 'Erro ORA-01008: Nem todas as variáveis foram vinculadas. Preencha os valores de todos os parâmetros (:PARAMETRO) antes de executar a consulta.';
    }
    if (msg.includes('NJS-138')) {
      return 'Erro NJS-138: Este banco de dados Oracle (ex: versão 11g) não é compatível com o Thin Mode padrão. Ative a opção "Modo Thick (Oracle Instant Client)" na conexão e certifique-se de ter o Oracle Instant Client 64-bit instalado.';
    }
    if (msg.includes('DPI-1047')) {
      return 'Erro DPI-1047: Não foi possível carregar a biblioteca Oracle Client de 64 bits (oci.dll). Verifique se o caminho do Instant Client informado está correto e se o Microsoft Visual C++ Redistributable (x64) está instalado.';
    }
    if (msg.includes('DPI-1072')) {
      return 'Erro DPI-1072: Falha ao inicializar o Oracle Client. Verifique se a versão do Instant Client é compatível com a arquitetura (64 bits) e se o Visual C++ Redistributable está instalado.';
    }
    if (msg.includes('ECONNREFUSED')) {
      return `Conexão recusada no servidor ${type.toUpperCase()}. Verifique se o banco de dados está ativo e a porta correta.`;
    }
    if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
      return `Tempo limite esgotado ao tentar conectar ao servidor ${type.toUpperCase()}. Verifique o firewall e o endereço de host.`;
    }
    if (msg.includes('password authentication failed') || msg.includes('Access denied') || msg.includes('ORA-01017')) {
      const hint = await this.describeLocalPortConflict(config);
      return `Falha de autenticação: Usuário ou senha incorretos para ${type.toUpperCase()}.${hint}`;
    }
    if (msg.includes('ORA-12541') || msg.includes('TNS:no listener')) {
      return 'Oracle Listener não encontrado no host e porta especificados (ORA-12541).';
    }
    if (msg.includes('ORA-12514') || msg.includes('TNS:listener does not currently know of service')) {
      return 'Serviço/Banco Oracle não encontrado pelo Listener (ORA-12514). Verifique o Service Name / SID.';
    }
    return msg;
  }
}
