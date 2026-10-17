import { describe, expect, it, vi } from 'vitest';
import { DatabaseService } from './DatabaseService';
import { DatabaseConnectionConfig } from '../../shared/types';
import * as network from '../utils/network';

describe('DatabaseService', () => {
  const service = new DatabaseService();

  it('rejeita configuração incompleta no teste de conexão', async () => {
    const invalidConfig: DatabaseConnectionConfig = {
      id: 'test',
      name: 'Incompleta',
      type: 'oracle',
      host: '',
      port: 1521,
      database: 'XEPDB1',
      user: ''
    };

    const res = await service.testConnection(invalidConfig);
    expect(res.success).toBe(false);
    expect(res.message).toContain('Configuração incompleta');
  });

  it('retorna erro se SQL estiver vazio', async () => {
    const config: DatabaseConnectionConfig = {
      id: 'test',
      name: 'Oracle Test',
      type: 'oracle',
      host: 'localhost',
      port: 1521,
      database: 'XEPDB1',
      user: 'system'
    };

    const res = await service.executeQuery(config, '   ');
    expect(res.success).toBe(false);
    expect(res.error).toBe('O comando SQL não pode estar vazio.');

    const resSemicolonOnly = await service.executeQuery(config, ' ;;;  ');
    expect(resSemicolonOnly.success).toBe(false);
    expect(resSemicolonOnly.error).toBe('O comando SQL não pode estar vazio.');
  });

  it('formata mensagens de erro amigáveis para timeout e recusa de conexão', async () => {
    const refused = await (service as any).formatErrorMessage(new Error('connect ECONNREFUSED 127.0.0.1:1521'), {
      type: 'oracle'
    });
    expect(refused).toContain('Conexão recusada no servidor ORACLE');

    const timeout = await (service as any).formatErrorMessage(new Error('ETIMEDOUT error'), { type: 'postgres' });
    expect(timeout).toContain('Tempo limite esgotado');

    const ora12541 = await (service as any).formatErrorMessage(new Error('ORA-12541: TNS:no listener'), {
      type: 'oracle'
    });
    expect(ora12541).toContain('Oracle Listener não encontrado');

    const njs138 = await (service as any).formatErrorMessage(
      new Error('NJS-138: connections to this database server version are not supported by node-oracledb in Thin mode'),
      { type: 'oracle' }
    );
    expect(njs138).toContain('NJS-138');
    expect(njs138).toContain('Modo Thick');

    const dpi1047 = await (service as any).formatErrorMessage(
      new Error('DPI-1047: Cannot locate a 64-bit Oracle Client library'),
      { type: 'oracle' }
    );
    expect(dpi1047).toContain('DPI-1047');
    expect(dpi1047).toContain('oci.dll');

    const ora01008 = await (service as any).formatErrorMessage(
      new Error('ORA-01008: not all variables bound'),
      { type: 'oracle' }
    );
    expect(ora01008).toContain('ORA-01008');
    expect(ora01008).toContain('Preencha os valores de todos os parâmetros');
  });

  it('interpola bind variables corretamente preservando literais e comentários', () => {
    const sql = "SELECT 'Texto :CODPROD', -- :CODPROD comentário\n CODPROD FROM TAB WHERE CODPROD = :CODPROD AND CODFILIAL = :CODFILIAL AND OBS = :OBS";
    const binds = {
      CODPROD: 12345,
      CODFILIAL: '1',
      OBS: null
    };

    const res = (service as any).interpolateBinds(sql, binds);
    expect(res).toBe("SELECT 'Texto :CODPROD', -- :CODPROD comentário\n CODPROD FROM TAB WHERE CODPROD = 12345 AND CODFILIAL = '1' AND OBS = NULL");
  });

  it('interpola variáveis de substituição do WinThor/Oracle (& e &&), @ e ${}', () => {
    const sql = "SELECT 'Texto &CODCLI' FROM TAB WHERE CODCLI = &CODCLI AND CODFILIAL = &&CODFILIAL AND DEP = @DEP AND ID = ${ID}";
    const binds = {
      CODCLI: 999,
      CODFILIAL: '01',
      DEP: 'TI',
      ID: 42
    };

    const res = (service as any).interpolateBinds(sql, binds);
    expect(res).toBe("SELECT 'Texto &CODCLI' FROM TAB WHERE CODCLI = 999 AND CODFILIAL = '01' AND DEP = 'TI' AND ID = 42");
  });

  it('Statement Tracer (sessões ativas) recusa conexões não-Oracle', async () => {
    const config: DatabaseConnectionConfig = {
      id: 'test',
      name: 'Postgres Test',
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres'
    };

    const res = await service.getOracleActiveSessions(config);
    expect(res.success).toBe(false);
    expect(res.sessions).toEqual([]);
    expect(res.error).toContain('apenas para conexões Oracle');
  });

  it('Statement Tracer (SQL recente) recusa conexões não-Oracle', async () => {
    const config: DatabaseConnectionConfig = {
      id: 'test',
      name: 'MySQL Test',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test',
      user: 'root'
    };

    const res = await service.getOracleRecentStatements(config);
    expect(res.success).toBe(false);
    expect(res.statements).toEqual([]);
    expect(res.error).toContain('apenas para conexões Oracle');
  });

  it('avisa sobre porta local ocupada quando o processo não parece ser o banco esperado', async () => {
    const spy = vi.spyOn(network, 'getListeningPid').mockResolvedValue({ pid: '1234', processName: 'nginx.exe' });
    try {
      const msg = await (service as any).formatErrorMessage(new Error('password authentication failed for user "x"'), {
        type: 'postgres',
        host: 'localhost',
        port: 5432
      });
      expect(msg).toContain('Falha de autenticação');
      expect(msg).toContain('PID 1234');
    } finally {
      spy.mockRestore();
    }
  });

  it('não avisa sobre porta local quando o processo já é o banco esperado', async () => {
    const spy = vi.spyOn(network, 'getListeningPid').mockResolvedValue({ pid: '1234', processName: 'postgres.exe' });
    try {
      const msg = await (service as any).formatErrorMessage(new Error('password authentication failed for user "x"'), {
        type: 'postgres',
        host: 'localhost',
        port: 5432
      });
      expect(msg).toContain('Falha de autenticação');
      expect(msg).not.toContain('PID');
    } finally {
      spy.mockRestore();
    }
  });

  it('não avisa sobre porta local quando o host não é loopback', async () => {
    const spy = vi.spyOn(network, 'getListeningPid').mockResolvedValue({ pid: '1234', processName: 'nginx.exe' });
    try {
      const msg = await (service as any).formatErrorMessage(new Error('password authentication failed for user "x"'), {
        type: 'postgres',
        host: 'db.remoto.com',
        port: 5432
      });
      expect(msg).toContain('Falha de autenticação');
      expect(msg).not.toContain('PID');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('enfileira chamadas concorrentes sequencialmente na mesma conexão', async () => {
    const order: number[] = [];
    const dummyConn = { id: 'conn_test' };
    const config: DatabaseConnectionConfig = {
      id: 'queue-test',
      name: 'Queue Test',
      type: 'oracle',
      host: 'localhost',
      port: 1521,
      database: 'XEPDB1',
      user: 'system'
    };

    const task1 = (service as any).withConnection(
      config,
      async () => dummyConn,
      async () => {},
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        order.push(1);
        return 1;
      },
      true
    );

    const task2 = (service as any).withConnection(
      config,
      async () => dummyConn,
      async () => {},
      async () => {
        order.push(2);
        return 2;
      },
      true
    );

    const results = await Promise.all([task1, task2]);
    expect(results).toEqual([1, 2]);
    expect(order).toEqual([1, 2]);
  });

  it('lista todas as tabelas de schemas grandes, sem cortar em 500', async () => {
    const tableRows = Array.from({ length: 1200 }, (_, i) => ({ table_name: `public.tabela_${i}` }));
    const fakeClient = {
      query: vi.fn().mockResolvedValue({ fields: [{ name: 'table_name' }], rows: tableRows }),
      end: vi.fn().mockResolvedValue(undefined)
    };
    const spy = vi.spyOn(service as any, 'getPgClient').mockResolvedValue(fakeClient);
    const config: DatabaseConnectionConfig = {
      id: 'many-tables',
      name: 'Schema Grande',
      type: 'postgres',
      host: 'db.remoto',
      port: 5432,
      database: 'erp',
      user: 'postgres'
    };

    try {
      const { tables, error } = await service.listTables(config);
      expect(error).toBeUndefined();
      expect(tables).toHaveLength(1200);
      expect(tables[1199]).toBe('public.tabela_1199');
    } finally {
      spy.mockRestore();
    }
  });

  describe('listTables / getTableColumns: distinguem vazio legítimo de falha', () => {
    const config: DatabaseConnectionConfig = {
      id: 'meta-err',
      name: 'Meta',
      type: 'postgres',
      host: 'db.remoto',
      port: 5432,
      database: 'erp',
      user: 'postgres'
    };
    const emptyResult = { success: true, columns: [], rows: [], rowCount: 0, executionTimeMs: 1, isQuery: true };

    it('banco sem tabelas: lista vazia e sem erro', async () => {
      const spy = vi.spyOn(service, 'executeQuery').mockResolvedValue(emptyResult);
      expect(await service.listTables(config)).toEqual({ tables: [] });
      spy.mockRestore();
    });

    it('falha reportada pela consulta: devolve o erro', async () => {
      const spy = vi
        .spyOn(service, 'executeQuery')
        .mockResolvedValue({ ...emptyResult, success: false, error: 'permission denied for schema x' });
      expect(await service.listTables(config)).toEqual({ tables: [], error: 'permission denied for schema x' });
      spy.mockRestore();
    });

    it('exceção (conexão caída): devolve o erro formatado', async () => {
      const spy = vi.spyOn(service, 'executeQuery').mockRejectedValue(new Error('boom'));
      const fmt = vi.spyOn(service as any, 'formatErrorMessage').mockResolvedValue('Conexão perdida');
      expect(await service.listTables(config)).toEqual({ tables: [], error: 'Conexão perdida' });
      spy.mockRestore();
      fmt.mockRestore();
    });

    it('getTableColumns: sucesso, tabela sem colunas e erro', async () => {
      const spy = vi.spyOn(service, 'executeQuery');
      spy.mockResolvedValueOnce({
        ...emptyResult,
        rows: [{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', is_pk: 'YES' }],
        rowCount: 1
      });
      const ok = await service.getTableColumns(config, 'public.t');
      expect(ok.error).toBeUndefined();
      expect(ok.columns).toEqual([
        { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true, length: undefined, defaultValue: undefined }
      ]);

      spy.mockResolvedValueOnce(emptyResult);
      expect(await service.getTableColumns(config, 'public.t')).toEqual({ columns: [] });

      spy.mockResolvedValueOnce({ ...emptyResult, success: false, error: 'relation does not exist' });
      expect(await service.getTableColumns(config, 'public.t')).toEqual({
        columns: [],
        error: 'relation does not exist'
      });
      spy.mockRestore();
    });
  });

  describe('insertRow / updateRow / deleteRow', () => {
    const config: DatabaseConnectionConfig = {
      id: 'mut-test',
      name: 'Mutation Test',
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'erp',
      user: 'postgres'
    };

    it('insertRow monta INSERT com binds posicionais e delega para executeQuery', async () => {
      const spy = vi.spyOn(service, 'executeQuery').mockResolvedValue({
        success: true,
        columns: [],
        rows: [],
        rowCount: 0,
        affectedRows: 1,
        executionTimeMs: 1,
        isQuery: false
      });

      const res = await service.insertRow(config, 'public.clientes', { nome: 'Ana', idade: 30 });

      expect(spy).toHaveBeenCalledWith(
        config,
        'INSERT INTO public.clientes (nome, idade) VALUES (:p0, :p1)',
        1,
        { p0: 'Ana', p1: 30 }
      );
      expect(res.affectedRows).toBe(1);
      spy.mockRestore();
    });

    it('insertRow rejeita nome de tabela ou coluna inválidos sem chamar o banco', async () => {
      const spy = vi.spyOn(service, 'executeQuery');

      const badTable = await service.insertRow(config, 'clientes; DROP TABLE x', { nome: 'Ana' });
      expect(badTable.success).toBe(false);
      expect(badTable.error).toContain('Nome de tabela inválido');

      const badColumn = await service.insertRow(config, 'clientes', { "nome' OR '1'='1": 'Ana' });
      expect(badColumn.success).toBe(false);
      expect(badColumn.error).toContain('Nome de coluna inválido');

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('updateRow monta UPDATE com SET e WHERE, tratando valor null como IS NULL', async () => {
      const spy = vi.spyOn(service, 'executeQuery').mockResolvedValue({
        success: true,
        columns: [],
        rows: [],
        rowCount: 0,
        affectedRows: 1,
        executionTimeMs: 1,
        isQuery: false
      });

      await service.updateRow(config, 'clientes', { nome: 'Ana Paula' }, { id: 42, deleted_at: null });

      expect(spy).toHaveBeenCalledWith(
        config,
        'UPDATE clientes SET nome = :p0 WHERE id = :p1 AND deleted_at IS NULL',
        1,
        { p0: 'Ana Paula', p1: 42 }
      );
      spy.mockRestore();
    });

    it('updateRow bloqueia atualização sem condição WHERE', async () => {
      const spy = vi.spyOn(service, 'executeQuery');
      const res = await service.updateRow(config, 'clientes', { nome: 'Ana' }, {});
      expect(res.success).toBe(false);
      expect(res.error).toContain('WHERE vazia');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('deleteRow monta DELETE com WHERE e bloqueia quando a condição está vazia', async () => {
      const spy = vi.spyOn(service, 'executeQuery').mockResolvedValue({
        success: true,
        columns: [],
        rows: [],
        rowCount: 0,
        affectedRows: 1,
        executionTimeMs: 1,
        isQuery: false
      });

      await service.deleteRow(config, 'clientes', { id: 42 });
      expect(spy).toHaveBeenCalledWith(config, 'DELETE FROM clientes WHERE id = :p0', 1, { p0: 42 });

      const blocked = await service.deleteRow(config, 'clientes', {});
      expect(blocked.success).toBe(false);
      expect(blocked.error).toContain('WHERE vazia');

      spy.mockRestore();
    });
  });

  describe('resolveConnectionConfig', () => {
    const mockConfigService = {
      getSettings: () => ({
        databaseConnections: [
          {
            id: 'conn-1',
            name: 'Oracle Local',
            type: 'oracle' as const,
            host: '127.0.0.1',
            port: 1521,
            database: 'XEPDB1',
            user: 'system',
            password: 'secret-password-123'
          }
        ]
      })
    } as any;

    it('mantém a senha caso já venha preenchida na conexão', () => {
      const svc = new DatabaseService(mockConfigService);
      const conn: DatabaseConnectionConfig = {
        id: 'conn-1',
        name: 'Oracle Local',
        type: 'oracle',
        host: '127.0.0.1',
        port: 1521,
        database: 'XEPDB1',
        user: 'system',
        password: 'override-password'
      };
      const resolved = svc.resolveConnectionConfig(conn);
      expect(resolved.password).toBe('override-password');
    });

    it('resolve a senha salva a partir do id da conexão quando a senha vier em branco', () => {
      const svc = new DatabaseService(mockConfigService);
      const conn: DatabaseConnectionConfig = {
        id: 'conn-1',
        name: 'Oracle Local',
        type: 'oracle',
        host: '127.0.0.1',
        port: 1521,
        database: 'XEPDB1',
        user: 'system',
        password: ''
      };
      const resolved = svc.resolveConnectionConfig(conn);
      expect(resolved.password).toBe('secret-password-123');
    });

    it('resolve a senha salva pela tupla (host, port, user, database) se o id for temporário ou diferente', () => {
      const svc = new DatabaseService(mockConfigService);
      const conn: DatabaseConnectionConfig = {
        id: 'temp',
        name: 'Oracle Temp',
        type: 'oracle',
        host: '127.0.0.1',
        port: 1521,
        database: 'XEPDB1',
        user: 'system',
        password: ''
      };
      const resolved = svc.resolveConnectionConfig(conn);
      expect(resolved.password).toBe('secret-password-123');
    });

    it('retorna a conexão intacta se configService não estiver configurado', () => {
      const svc = new DatabaseService();
      const conn: DatabaseConnectionConfig = {
        id: 'conn-1',
        name: 'Oracle Local',
        type: 'oracle',
        host: '127.0.0.1',
        port: 1521,
        database: 'XEPDB1',
        user: 'system',
        password: ''
      };
      const resolved = svc.resolveConnectionConfig(conn);
      expect(resolved.password).toBe('');
    });
  });
});
