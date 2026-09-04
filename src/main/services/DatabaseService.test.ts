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
  });

  it('formata mensagens de erro amigáveis para timeout e recusa de conexão', () => {
    const refused = (service as any).formatErrorMessage(new Error('connect ECONNREFUSED 127.0.0.1:1521'), 'oracle');
    expect(refused).toContain('Conexão recusada no servidor ORACLE');

    const timeout = (service as any).formatErrorMessage(new Error('ETIMEDOUT error'), 'postgres');
    expect(timeout).toContain('Tempo limite esgotado');

    const ora12541 = (service as any).formatErrorMessage(new Error('ORA-12541: TNS:no listener'), 'oracle');
    expect(ora12541).toContain('Oracle Listener não encontrado');
  });
});
