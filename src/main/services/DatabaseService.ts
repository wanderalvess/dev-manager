import { DatabaseConnectionConfig, QueryResult, TableInfo } from '../../shared/types';

export class DatabaseService {
  /**
   * Testa a conectividade com o banco de dados especificado.
   */
  public async testConnection(
    config: DatabaseConnectionConfig
  ): Promise<{ success: boolean; message: string; version?: string }> {
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
        message: this.formatErrorMessage(err, config.type)
      };
    }
  }

  /**
   * Executa uma consulta (SELECT) ou comando de modificação (UPDATE, INSERT, DELETE, etc.).
   */
  public async executeQuery(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows = 200
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const trimmedSql = sql.trim();

    if (!trimmedSql) {
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
          return await this.executePostgres(config, trimmedSql, maxRows, startTime);
        case 'mysql':
          return await this.executeMysql(config, trimmedSql, maxRows, startTime);
        case 'oracle':
          return await this.executeOracle(config, trimmedSql, maxRows, startTime);
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
        error: this.formatErrorMessage(err, config.type)
      };
    }
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
        query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name";
      } else if (config.type === 'mysql') {
        query = 'SHOW TABLES';
      }

      const res = await this.executeQuery(config, query, 500);
      if (!res.success || !res.rows) return [];

      return res.rows.map((row) => {
        const firstKey = Object.keys(row)[0];
        return String(row[firstKey]);
      });
    } catch {
      return [];
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
    const client = await this.getPgClient(config);
    try {
      const res = await client.query('SELECT version();');
      const version = res.rows[0]?.version || 'PostgreSQL Conectado com Sucesso';
      return { success: true, message: 'Conexão bem-sucedida ao PostgreSQL!', version };
    } finally {
      await client.end().catch(() => {});
    }
  }

  private async executePostgres(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows: number,
    startTime: number
  ): Promise<QueryResult> {
    const client = await this.getPgClient(config);
    try {
      const res = await client.query(sql);
      const executionTimeMs = Date.now() - startTime;

      if (Array.isArray(res)) {
        // Múltiplos comandos
        const last = res[res.length - 1];
        const isQuery = Boolean(last.fields && last.fields.length > 0);
        return {
          success: true,
          columns: isQuery ? last.fields.map((f: any) => f.name) : [],
          rows: isQuery ? (last.rows || []).slice(0, maxRows) : [],
          rowCount: isQuery ? (last.rows ? last.rows.length : 0) : 0,
          affectedRows: !isQuery ? last.rowCount ?? undefined : undefined,
          executionTimeMs,
          isQuery
        };
      }

      const isQuery = Boolean(res.fields && res.fields.length > 0);
      return {
        success: true,
        columns: isQuery ? res.fields.map((f: any) => f.name) : [],
        rows: isQuery ? (res.rows || []).slice(0, maxRows) : [],
        rowCount: isQuery ? (res.rows ? res.rows.length : 0) : 0,
        affectedRows: !isQuery ? res.rowCount ?? undefined : undefined,
        executionTimeMs,
        isQuery
      };
    } finally {
      await client.end().catch(() => {});
    }
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
    const conn = await this.getMysqlConnection(config);
    try {
      const [rows] = await conn.query('SELECT VERSION() as version;');
      const version = (rows as any)?.[0]?.version || 'MySQL Conectado com Sucesso';
      return { success: true, message: 'Conexão bem-sucedida ao MySQL!', version: `MySQL ${version}` };
    } finally {
      await conn.end().catch(() => {});
    }
  }

  private async executeMysql(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows: number,
    startTime: number
  ): Promise<QueryResult> {
    const conn = await this.getMysqlConnection(config);
    try {
      const [result, fields] = await conn.query(sql);
      const executionTimeMs = Date.now() - startTime;

      if (Array.isArray(result) && fields) {
        // É um SELECT / resultado com colunas
        const columns = (fields as any[]).map((f) => f.name);
        const rows = (result as Record<string, any>[]).slice(0, maxRows);
        return {
          success: true,
          columns,
          rows,
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
    } finally {
      await conn.end().catch(() => {});
    }
  }

  // =========================================================================
  // Implementação Oracle (Thin Mode puro JavaScript)
  // =========================================================================

  private async getOracleConnection(config: DatabaseConnectionConfig) {
    let oracleModule: any;
    try {
      // @ts-ignore - oracledb é carregado dinamicamente
      oracleModule = await import('oracledb');
    } catch {
      throw new Error("Driver do Oracle não instalado. Execute: npm install oracledb");
    }

    const oracledb = oracleModule.default || oracleModule;

    // Montar string de conexão Oracle
    // Para Service Name: host:port/serviceName
    // Para SID: host:port:SID
    const separator = config.oracleMode === 'sid' ? ':' : '/';
    const connectString = `${config.host}:${config.port || 1521}${separator}${config.database}`;

    const conn = await oracledb.getConnection({
      user: config.user,
      password: config.password,
      connectString
    });

    return { conn, oracledb };
  }

  private async testOracle(config: DatabaseConnectionConfig) {
    const { conn, oracledb } = await this.getOracleConnection(config);
    try {
      const result = await conn.execute('SELECT * FROM v$version WHERE banner LIKE \'Oracle%\'', [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });
      const banner = (result.rows as any[])?.[0]?.BANNER || 'Oracle Database Conectado (Thin Mode)';
      return { success: true, message: 'Conexão bem-sucedida ao Oracle!', version: banner };
    } catch {
      // Fallback caso usuário não tenha permissão no v$version
      return { success: true, message: 'Conexão bem-sucedida ao Oracle Database!' };
    } finally {
      await conn.close().catch(() => {});
    }
  }

  private async executeOracle(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows: number,
    startTime: number
  ): Promise<QueryResult> {
    const { conn, oracledb } = await this.getOracleConnection(config);
    try {
      const isSelect = /^\s*(SELECT|WITH)\s+/i.test(sql);

      const result = await conn.execute(
        sql,
        [],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          autoCommit: true,
          maxRows: isSelect ? maxRows : undefined
        }
      );

      const executionTimeMs = Date.now() - startTime;

      if (result.rows && result.metaData) {
        const columns = result.metaData.map((m: any) => m.name);
        const rows = (result.rows as Record<string, any>[]).slice(0, maxRows);
        return {
          success: true,
          columns,
          rows,
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
    } finally {
      await conn.close().catch(() => {});
    }
  }

  private formatErrorMessage(err: any, type: string): string {
    const msg = err?.message || String(err);
    if (msg.includes('ECONNREFUSED')) {
      return `Conexão recusada no servidor ${type.toUpperCase()}. Verifique se o banco de dados está ativo e a porta correta.`;
    }
    if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
      return `Tempo limite esgotado ao tentar conectar ao servidor ${type.toUpperCase()}. Verifique o firewall e o endereço de host.`;
    }
    if (msg.includes('password authentication failed') || msg.includes('Access denied') || msg.includes('ORA-01017')) {
      return `Falha de autenticação: Usuário ou senha incorretos para ${type.toUpperCase()}.`;
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
