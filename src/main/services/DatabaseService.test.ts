import { describe, expect, it } from 'vitest';
import { DatabaseService } from './DatabaseService';
import { DatabaseConnectionConfig } from '../../shared/types';

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

  it('formata mensagens de erro amigáveis para timeout e recusa de conexão', () => {
    const refused = (service as any).formatErrorMessage(new Error('connect ECONNREFUSED 127.0.0.1:1521'), 'oracle');
    expect(refused).toContain('Conexão recusada no servidor ORACLE');

    const timeout = (service as any).formatErrorMessage(new Error('ETIMEDOUT error'), 'postgres');
    expect(timeout).toContain('Tempo limite esgotado');

    const ora12541 = (service as any).formatErrorMessage(new Error('ORA-12541: TNS:no listener'), 'oracle');
    expect(ora12541).toContain('Oracle Listener não encontrado');

    const njs138 = (service as any).formatErrorMessage(
      new Error('NJS-138: connections to this database server version are not supported by node-oracledb in Thin mode'),
      'oracle'
    );
    expect(njs138).toContain('NJS-138');
    expect(njs138).toContain('Modo Thick');

    const dpi1047 = (service as any).formatErrorMessage(
      new Error('DPI-1047: Cannot locate a 64-bit Oracle Client library'),
      'oracle'
    );
    expect(dpi1047).toContain('DPI-1047');
    expect(dpi1047).toContain('oci.dll');

    const ora01008 = (service as any).formatErrorMessage(
      new Error('ORA-01008: not all variables bound'),
      'oracle'
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
});
