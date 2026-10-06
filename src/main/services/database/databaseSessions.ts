import { randomUUID } from 'crypto';
import type { DatabaseConnectionConfig, DbSessionState, QueryResult } from '../../../shared/types';
import { classifySqlStatement, normalizeSqlForExecution } from '../../../shared/sqlStatementUtils';
import type { DatabaseContext } from './databaseContext';
import { runOracleStatement } from './databaseOracle';
import { runPostgresStatement } from './databasePostgres';
import { runMysqlStatement } from './databaseMysql';

const MAX_SESSIONS = 8;
const IDLE_CLOSE_MS = 30 * 60 * 1000;
const SWEEP_EVERY_MS = 60 * 1000;
const CANCEL_SAVEPOINT = 'dm_stmt';

interface Session {
  id: string;
  config: DatabaseConnectionConfig;
  /** Oracle: { conn, oracledb }; PostgreSQL: client; MySQL: connection. */
  handle: any;
  autoCommit: boolean;
  pendingStatements: number;
  pendingRows: number;
  running: boolean;
  /** PostgreSQL: há BEGIN aberto nesta sessão. */
  inTx: boolean;
  /** PostgreSQL: pid do backend (para pg_cancel_backend); MySQL: threadId (para KILL QUERY). */
  backendId?: number;
  lastUsed: number;
}

/** Erros que indicam que a conexão física caiu: a sessão (e a transação aberta) já se perdeu. */
export function isConnectionLostError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '');
  const code = String((err as any)?.code ?? '');
  return (
    /ORA-0(3113|3114|3135|3136|1012)|ORA-00028|NJS-(003|500|503|521)|DPI-1010|DPI-1080/i.test(msg) ||
    /Connection terminated|terminating connection|server closed the connection|Client has encountered a connection error/i.test(msg) ||
    /PROTOCOL_CONNECTION_LOST|ECONNRESET|EPIPE|Can't add new command when connection is in closed state/i.test(msg + ' ' + code)
  );
}

/**
 * Sessões dedicadas por aba do editor: cada uma tem a PRÓPRIA conexão física, o que torna possível
 * transação multi-statement (modo manual com commit/rollback) e cancelar uma consulta em andamento.
 * A conexão compartilhada de withConnection continua servindo MCP, QA, tracer e backup.
 */
export class DatabaseSessionManager {
  private sessions = new Map<string, Session>();
  private sweeper?: ReturnType<typeof setInterval>;

  constructor(private readonly ctx: DatabaseContext) {}

  private stateOf(s: Session): DbSessionState {
    return {
      sessionId: s.id,
      dbType: s.config.type,
      autoCommit: s.autoCommit,
      pendingStatements: s.pendingStatements,
      pendingRows: s.pendingRows,
      running: s.running
    };
  }

  private get(sessionId: string): Session {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Sessão não encontrada ou expirada. Execute novamente para abrir uma nova.');
    return s;
  }

  private ensureSweeper(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => void this.sweepIdle(Date.now()), SWEEP_EVERY_MS);
    this.sweeper.unref?.();
  }

  /** Fecha sessões ociosas SEM transação aberta; as que têm alterações pendentes nunca são fechadas em silêncio. */
  async sweepIdle(now: number): Promise<number> {
    let closed = 0;
    for (const s of [...this.sessions.values()]) {
      if (!s.running && s.pendingStatements === 0 && !s.inTx && now - s.lastUsed > IDLE_CLOSE_MS) {
        await this.close(s.id);
        closed++;
      }
    }
    return closed;
  }

  async open(config: DatabaseConnectionConfig, autoCommit = true): Promise<DbSessionState> {
    if (this.sessions.size >= MAX_SESSIONS) {
      throw new Error(`Limite de ${MAX_SESSIONS} sessões abertas atingido. Feche alguma aba de consulta.`);
    }
    const resolved = this.ctx.resolveConnectionConfig(config);
    let handle: any;
    let backendId: number | undefined;

    switch (resolved.type) {
      case 'oracle':
        handle = await this.ctx.getOracleConnection(resolved);
        break;
      case 'postgres': {
        handle = await this.ctx.getPgClient(resolved);
        const r = await handle.query('SELECT pg_backend_pid() AS pid');
        backendId = r.rows?.[0]?.pid;
        break;
      }
      case 'mysql':
        handle = await this.ctx.getMysqlConnection(resolved);
        backendId = handle.threadId;
        if (!autoCommit) await handle.query('SET autocommit = 0');
        break;
      default:
        throw new Error(`Tipo de banco '${resolved.type}' não suportado.`);
    }

    const session: Session = {
      id: randomUUID(),
      config: resolved,
      handle,
      autoCommit,
      pendingStatements: 0,
      pendingRows: 0,
      running: false,
      inTx: false,
      backendId,
      lastUsed: Date.now()
    };
    this.sessions.set(session.id, session);
    this.ensureSweeper();
    return this.stateOf(session);
  }

  getState(sessionId: string): DbSessionState {
    return this.stateOf(this.get(sessionId));
  }

  async execute(
    sessionId: string,
    sql: string,
    maxRows = 200,
    binds?: Record<string, any>
  ): Promise<QueryResult & { session: DbSessionState }> {
    const s = this.get(sessionId);
    const startTime = Date.now();
    const fail = (error: string): QueryResult & { session: DbSessionState } => ({
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Date.now() - startTime,
      isQuery: false,
      error,
      session: this.stateOf(s)
    });

    maxRows = Number.isFinite(maxRows) && maxRows > 0 ? Math.floor(maxRows) : 200;
    const cleanSql = normalizeSqlForExecution(sql, s.config.type);
    if (!cleanSql) return fail('O comando SQL não pode estar vazio.');
    if (s.running) return fail('Já há uma consulta em execução nesta sessão. Aguarde ou cancele.');

    const kind = classifySqlStatement(cleanSql);
    const manual = !s.autoCommit;
    const type = s.config.type;
    s.running = true;
    s.lastUsed = Date.now();
    let usedSavepoint = false;

    try {
      const opensTx = kind === 'dml' || kind === 'ddl' || kind === 'plsql';
      if (type === 'postgres' && manual && kind !== 'commit' && kind !== 'rollback' && (opensTx || s.inTx)) {
        if (!s.inTx) {
          await s.handle.query('BEGIN');
          s.inTx = true;
        }
        // Um erro dentro de transação do PostgreSQL aborta a transação inteira; o savepoint por comando
        // devolve o comportamento esperado (só o comando que falhou é desfeito).
        await s.handle.query(`SAVEPOINT ${CANCEL_SAVEPOINT}`);
        usedSavepoint = true;
      }

      let result: QueryResult;
      if (type === 'oracle') {
        result = await runOracleStatement(
          this.ctx, s.handle.conn, s.handle.oracledb, cleanSql, maxRows, startTime, binds, s.autoCommit
        );
      } else if (type === 'postgres') {
        result = await runPostgresStatement(this.ctx, s.handle, cleanSql, maxRows, startTime, binds);
        if (usedSavepoint) await s.handle.query(`RELEASE SAVEPOINT ${CANCEL_SAVEPOINT}`);
      } else {
        result = await runMysqlStatement(this.ctx, s.handle, cleanSql, maxRows, startTime, binds);
      }

      this.trackTransaction(s, kind, result, manual);
      return { ...result, session: this.stateOf(s) };
    } catch (err) {
      if (isConnectionLostError(err)) {
        const lost = s.pendingStatements > 0 || s.inTx;
        await this.close(s.id, false);
        return {
          ...fail(
            `${await this.ctx.formatErrorMessage(err, s.config)}\nA conexão da sessão foi perdida` +
              (lost ? ' e as alterações pendentes foram descartadas pelo banco.' : '.')
          ),
          session: { ...this.stateOf(s), pendingStatements: 0, pendingRows: 0, running: false }
        };
      }
      if (usedSavepoint) {
        try {
          await s.handle.query(`ROLLBACK TO SAVEPOINT ${CANCEL_SAVEPOINT}`);
        } catch {
          // a conexão pode ter caído; o próximo comando acusa
        }
      }
      return fail(await this.ctx.formatErrorMessage(err, s.config));
    } finally {
      s.running = false;
      s.lastUsed = Date.now();
    }
  }

  /** Atualiza o contador de alterações pendentes conforme o tipo de comando executado. */
  private trackTransaction(s: Session, kind: ReturnType<typeof classifySqlStatement>, result: QueryResult, manual: boolean): void {
    const type = s.config.type;
    if (kind === 'commit' || kind === 'rollback') {
      s.pendingStatements = 0;
      s.pendingRows = 0;
      s.inTx = false;
      return;
    }
    if (!manual) return;

    if (kind === 'dml' || kind === 'plsql') {
      s.pendingStatements++;
      s.pendingRows += result.affectedRows ?? 0;
    } else if (kind === 'ddl') {
      if (type === 'postgres') {
        // DDL do PostgreSQL é transacional: fica pendente e pode ser revertido
        s.pendingStatements++;
      } else {
        // Oracle e MySQL fazem commit implícito: tudo que estava pendente foi gravado
        s.pendingStatements = 0;
        s.pendingRows = 0;
      }
    }
  }

  async commit(sessionId: string): Promise<DbSessionState> {
    const s = this.get(sessionId);
    if (s.running) throw new Error('Há uma consulta em execução. Aguarde ou cancele antes de confirmar.');
    if (s.config.type === 'oracle') await s.handle.conn.commit();
    else await s.handle.query('COMMIT');
    s.pendingStatements = 0;
    s.pendingRows = 0;
    s.inTx = false;
    s.lastUsed = Date.now();
    return this.stateOf(s);
  }

  async rollback(sessionId: string): Promise<DbSessionState> {
    const s = this.get(sessionId);
    if (s.running) throw new Error('Há uma consulta em execução. Aguarde ou cancele antes de desfazer.');
    if (s.config.type === 'oracle') await s.handle.conn.rollback();
    else await s.handle.query('ROLLBACK');
    s.pendingStatements = 0;
    s.pendingRows = 0;
    s.inTx = false;
    s.lastUsed = Date.now();
    return this.stateOf(s);
  }

  /** Alterna o modo. Ao voltar para auto-commit, o que estava pendente é confirmado (como o setAutoCommit do JDBC). */
  async setAutoCommit(sessionId: string, autoCommit: boolean): Promise<DbSessionState> {
    const s = this.get(sessionId);
    if (s.running) throw new Error('Há uma consulta em execução. Aguarde ou cancele antes de trocar o modo.');
    if (s.autoCommit === autoCommit) return this.stateOf(s);
    if (autoCommit && (s.pendingStatements > 0 || s.inTx)) {
      await this.commit(sessionId);
    }
    if (s.config.type === 'mysql') {
      await s.handle.query(`SET autocommit = ${autoCommit ? 1 : 0}`);
    }
    s.autoCommit = autoCommit;
    s.lastUsed = Date.now();
    return this.stateOf(s);
  }

  /** Interrompe a consulta em andamento sem derrubar a sessão. */
  async cancel(sessionId: string): Promise<DbSessionState> {
    const s = this.get(sessionId);
    if (!s.running) return this.stateOf(s);

    if (s.config.type === 'oracle') {
      await s.handle.conn.break();
    } else if (s.config.type === 'postgres') {
      const killer = await this.ctx.getPgClient(s.config);
      try {
        await killer.query('SELECT pg_cancel_backend($1)', [s.backendId]);
      } finally {
        await killer.end().catch(() => {});
      }
    } else {
      const killer = await this.ctx.getMysqlConnection(s.config);
      try {
        await killer.query(`KILL QUERY ${Number(s.backendId)}`);
      } finally {
        await killer.end().catch(() => {});
      }
    }
    return this.stateOf(s);
  }

  /** Fecha a sessão. Com `rollbackFirst`, desfaz o que estiver pendente (fechar a conexão já faz isso no banco). */
  async close(sessionId: string, rollbackFirst = true): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    this.sessions.delete(sessionId);
    try {
      if (rollbackFirst && (s.pendingStatements > 0 || s.inTx) && !s.running) {
        if (s.config.type === 'oracle') await s.handle.conn.rollback();
        else await s.handle.query('ROLLBACK');
      }
    } catch {
      // melhor esforço: fechar a conexão descarta a transação de qualquer forma
    }
    try {
      if (s.config.type === 'oracle') await s.handle.conn.close();
      else if (s.config.type === 'postgres') await s.handle.end();
      else await s.handle.end();
    } catch {
      // conexão já caída
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((id) => this.close(id)));
    if (this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = undefined;
    }
  }

  get size(): number {
    return this.sessions.size;
  }
}
