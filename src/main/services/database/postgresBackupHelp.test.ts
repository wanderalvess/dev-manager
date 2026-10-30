import { describe, expect, it } from 'vitest';
import { explainPostgresFailure, extractPostgresErrorLines, isPostgresTool, type PostgresFailureContext } from './postgresBackupHelp';

const ctx: PostgresFailureContext = {
  binary: 'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  operation: 'backup',
  host: '127.0.0.1',
  port: 5432,
  user: 'teste',
  database: 'vendas'
};

describe('postgresBackupHelp', () => {
  it('reconhece os utilitários do cliente pelo nome, também com caminho do Windows', () => {
    expect(isPostgresTool('pg_dump')).toBe(true);
    expect(isPostgresTool('C:\\pg\\bin\\PSQL.EXE')).toBe(true);
    expect(isPostgresTool('/usr/bin/pg_restore')).toBe(true);
    expect(isPostgresTool('mysqldump')).toBe(false);
  });

  it('banco inexistente: lista os bancos do servidor e dá o CREATE DATABASE', () => {
    const out = 'pg_dump: error: connection to server at "127.0.0.1", port 5432 failed: FATAL:  database "vendas" does not exist';
    const res = explainPostgresFailure(out, { ...ctx, databases: ['origem', 'postgres'] })!;
    expect(res.message).toBe('O banco vendas não existe no servidor PostgreSQL 127.0.0.1:5432.');
    expect(res.help?.steps[0]).toContain('origem, postgres');
    expect(res.help?.snippets?.[0].code).toBe('CREATE DATABASE "vendas" OWNER "teste";');
    expect(res.help?.detail).toContain('does not exist');
  });

  it('entende as mensagens do servidor em português', () => {
    expect(explainPostgresFailure('FATAL:  banco de dados "vendas" não existe', ctx)?.message).toContain('não existe');
    expect(explainPostgresFailure('FATAL:  autenticação do tipo password falhou para o usuário "teste"', ctx)?.message).toContain(
      'Usuário ou senha incorretos'
    );
  });

  it('senha errada, pg_hba e servidor fora do ar', () => {
    const auth = explainPostgresFailure('FATAL:  password authentication failed for user "teste"', ctx)!;
    expect(auth.help?.steps.join(' ')).toContain('quando o usuário teste não existe');
    expect(auth.help?.snippets?.[1].code).toBe(`ALTER ROLE "teste" WITH PASSWORD 'nova_senha';`);
    expect(
      explainPostgresFailure('FATAL:  no pg_hba.conf entry for host "10.0.0.5", user "teste", database "vendas", no encryption', ctx)?.message
    ).toContain('pg_hba.conf');
    expect(
      explainPostgresFailure('pg_dump: error: connection to server at "127.0.0.1", port 5432 failed: Connection refused', ctx)?.help?.snippets?.[0].code
    ).toBe('pg_isready -h 127.0.0.1 -p 5432');
  });

  it('pg_dump mais antigo que o servidor diz as duas versões', () => {
    const out = 'pg_dump: error: aborting because of server version mismatch\npg_dump: detail: server version: 17.2; pg_dump version: 16.11';
    const res = explainPostgresFailure(out, ctx)!;
    expect(res.message).toBe('O pg_dump 16.11 é mais antigo que o servidor PostgreSQL 17.2.');
    expect(res.help?.detail).toContain('server version: 17.2');
  });

  it('dono dos objetos inexistente na restauração e usuário inexistente na conexão', () => {
    const restore = { ...ctx, operation: 'restore' as const, binary: 'psql' };
    const owner = explainPostgresFailure('psql:backup.sql:40: ERROR:  role "app_owner" does not exist', restore)!;
    expect(owner.message).toContain('app_owner');
    expect(owner.help?.steps.join(' ')).toContain('--no-owner');
    expect(explainPostgresFailure('FATAL:  role "teste" does not exist', ctx)?.message).toBe('O usuário teste não existe no servidor PostgreSQL 127.0.0.1:5432.');
  });

  it('permissão: leitura no backup, dono do banco na restauração, e pasta de destino', () => {
    expect(explainPostgresFailure('pg_dump: error: query failed: ERROR:  permission denied for table produto', ctx)?.help?.snippets?.[0].code).toContain(
      'GRANT SELECT ON ALL TABLES IN SCHEMA public TO "teste";'
    );
    expect(
      explainPostgresFailure('pg_restore: error: could not execute query: ERROR:  permission denied for schema public', { ...ctx, operation: 'restore' })
        ?.help?.snippets?.[0].code
    ).toBe('ALTER DATABASE "vendas" OWNER TO "teste";');
    expect(explainPostgresFailure('pg_dump: error: could not open output file "C:\\x\\a.sql": Permission denied', ctx)?.message).toContain(
      'pasta de destino'
    );
  });

  it('arquivo errado no pg_restore e objetos existentes na restauração', () => {
    const restore = { ...ctx, operation: 'restore' as const };
    expect(explainPostgresFailure('pg_restore: error: input file appears to be a text format dump. Please use psql.', restore)?.message).toContain(
      'SQL puro'
    );
    expect(explainPostgresFailure('pg_restore: error: input file does not appear to be a valid archive', restore)?.message).toContain(
      'backup válido'
    );
    expect(explainPostgresFailure('psql:b.sql:20: ERROR:  relation "produto" already exists', restore)?.message).toContain('já existem');
  });

  it('reconhece as mensagens do servidor e do libpq traduzidas para o português', () => {
    expect(explainPostgresFailure('FATAL:  autenticação do tipo senha falhou para o usuário "teste"', ctx)?.message).toContain(
      'Usuário ou senha incorretos'
    );
    expect(
      explainPostgresFailure('pg_dump: erro: conexão com servidor em "127.0.0.1", porta 5432 falhou: Connection refused', ctx)
    ).not.toBeNull();
  });

  it('extrai as linhas de erro e devolve null para o que não conhece', () => {
    expect(extractPostgresErrorLines('ok\npg_dump: error: algo\npg_dump: error: algo')).toEqual(['pg_dump: error: algo']);
    expect(explainPostgresFailure('pg_dump: error: algo novo', ctx)).toBeNull();
  });
});
