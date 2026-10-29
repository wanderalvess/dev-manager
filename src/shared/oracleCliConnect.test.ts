import { describe, expect, it } from 'vitest';
import { buildOracleConnectDescriptor, buildOracleConnectEnv } from './oracleCliConnect';

describe('oracleCliConnect', () => {
  it('monta o descritor com SERVICE_NAME por padrão e SID no modo SID', () => {
    expect(buildOracleConnectDescriptor({ host: 'localhost', port: 1521, database: 'orcl' })).toBe(
      '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=orcl)))'
    );
    expect(buildOracleConnectDescriptor({ host: 'db', database: 'XE', oracleMode: 'sid' })).toBe(
      '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=db)(PORT=1521))(CONNECT_DATA=(SID=XE)))'
    );
  });

  it('define LOCAL (Windows) e TWO_TASK (demais) com o mesmo descritor', () => {
    const env = buildOracleConnectEnv({ host: 'localhost', port: '1521', database: 'orcl' });
    expect(env.LOCAL).toBe(env.TWO_TASK);
    expect(env.LOCAL).toContain('(SERVICE_NAME=orcl)');
  });
});
