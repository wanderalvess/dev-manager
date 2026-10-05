import { describe, expect, it } from 'vitest';
import {
  buildDataPumpStartMessage,
  cleanContainerName,
  formatOracleRunError,
  formatSqlPlusOpenError,
  resolveDumpSelectValue,
  resolveInitialDumpfile,
  resolveOracleOutput
} from './oracleMaintenanceUtils';

describe('oracleMaintenanceUtils', () => {
  it('remove apenas a barra inicial do nome do container', () => {
    expect(cleanContainerName('/oracle-xe')).toBe('oracle-xe');
    expect(cleanContainerName('oracle/xe')).toBe('oracle/xe');
  });

  it('prioriza output, depois error, depois placeholder', () => {
    expect(resolveOracleOutput({ output: 'ok', error: 'x' })).toBe('ok');
    expect(resolveOracleOutput({ error: 'falhou' })).toBe('falhou');
    expect(resolveOracleOutput({})).toBe('(Sem saída)');
  });

  it('formata erros com message ou valor bruto', () => {
    expect(formatOracleRunError(new Error('boom'))).toBe('Erro: boom');
    expect(formatOracleRunError('texto')).toBe('Erro: texto');
    expect(formatSqlPlusOpenError({ message: 'nope' })).toBe('Falha ao abrir SQL*Plus: nope');
  });

  it('monta a mensagem inicial do Data Pump', () => {
    expect(buildDataPumpStartMessage('a.dmp')).toContain('import_dump.sh (a.dmp)');
  });

  it('resolve valor do select e dump inicial', () => {
    const dumps = [{ name: 'a.dmp' }, { name: 'b.dmp' }];
    expect(resolveDumpSelectValue(dumps, 'b.dmp')).toBe('b.dmp');
    expect(resolveDumpSelectValue(dumps, 'zzz.dmp')).toBe('');
    expect(resolveInitialDumpfile(dumps)).toBe('a.dmp');
    expect(resolveInitialDumpfile([])).toBe('backup.dmp');
  });
});
