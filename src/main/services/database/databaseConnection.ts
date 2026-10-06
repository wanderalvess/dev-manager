import { createHash } from 'crypto';
import type { DatabaseConnectionConfig } from '../../../shared/types';
import type { DatabaseContext } from './databaseContext';

/**
 * Resolve a senha da conexão caso tenha vindo em branco/sanitizada, buscando nas
 * configurações salvas em memória através do id da conexão ou da tupla (host, port, user, database).
 */
export function resolveConnectionConfig(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig
): DatabaseConnectionConfig {
  if (config.password || !ctx.configService) {
    return config;
  }
  const settings = ctx.configService.getSettings();
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

function cacheKey(config: DatabaseConnectionConfig): string {
  // Tudo que muda a sessão física entra na chave; a senha só como hash, para não manter o segredo como chave de Map
  const passwordHash = config.password ? createHash('sha256').update(config.password).digest('hex').slice(0, 12) : '';
  return [
    config.type,
    config.host,
    config.port,
    config.database,
    config.user,
    passwordHash,
    config.oracleMode ?? '',
    config.oracleThickMode ? 'thick' : '',
    config.oracleClientPath ?? '',
    config.ssl ? 'ssl' : ''
  ].join('|');
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
export async function withConnection<T, R>(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  getConn: () => Promise<T>,
  closeConn: (conn: T) => Promise<void>,
  fn: (conn: T) => Promise<R>,
  reuse = false
): Promise<R> {
  config = ctx.resolveConnectionConfig(config);
  if (!reuse) {
    const conn = await getConn();
    try {
      return await fn(conn);
    } finally {
      await closeConn(conn).catch(() => {});
    }
  }

  const key = cacheKey(config);
  let cachedPromise = ctx.connCache.get(key);
  if (!cachedPromise) {
    cachedPromise = getConn().then((conn) => ({
      conn,
      close: closeConn as (c: any) => Promise<void>,
      timer: undefined as any,
      queue: Promise.resolve(),
      active: 0
    }));
    // Se a conexão falhar, remove a entrada para permitir uma nova tentativa
    // (sem consumir a rejeição de quem está aguardando `cachedPromise` abaixo).
    cachedPromise.catch(() => ctx.connCache.delete(key));
    ctx.connCache.set(key, cachedPromise);
  }

  const cached = await cachedPromise;

  // O timer de ociosidade conta a partir do FIM da última execução. Armado no início, ele fechava a
  // conexão no meio de uma consulta mais longa que idleMs.
  const armIdleTimer = () => {
    clearTimeout(cached.timer);
    cached.timer = setTimeout(() => {
      ctx.connCache.delete(key);
      cached.close(cached.conn).catch(() => {});
    }, ctx.idleMs);
  };

  cached.active++;
  clearTimeout(cached.timer);

  const runInQueue = () => {
    const next = cached.queue.then(() => fn(cached.conn as T));
    cached.queue = next.catch(() => {});
    return next;
  };

  try {
    const result = await runInQueue();
    cached.active--;
    if (cached.active === 0) armIdleTimer();
    return result;
  } catch (err) {
    cached.active--;
    clearTimeout(cached.timer);
    ctx.connCache.delete(key);
    await closeConn(cached.conn as T).catch(() => {});
    throw err;
  }
}
