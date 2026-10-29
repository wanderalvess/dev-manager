type OracleCliTarget = {
  host?: string;
  port?: number | string;
  database?: string;
  oracleMode?: 'serviceName' | 'sid';
};

/** Descritor TNS completo da conexão (SERVICE_NAME, ou SID no modo SID). */
export function buildOracleConnectDescriptor(config: OracleCliTarget): string {
  const port = config.port || 1521;
  const target = config.oracleMode === 'sid' ? `SID=${config.database || ''}` : `SERVICE_NAME=${config.database || ''}`;
  return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${config.host || ''})(PORT=${port}))(CONNECT_DATA=(${target})))`;
}

/**
 * Banco padrão dos utilitários Oracle (exp, imp, expdp, impdp) por variável de ambiente:
 * `LOCAL` no Windows e `TWO_TASK` nos demais. Assim a conexão não vai na linha de comando,
 * onde nenhum formato funciona sem a senha: em `usuario@host:porta/servico` a `/` é lida
 * como separador da senha (ORA-12504), e o descritor entre parênteses quebra o parser de
 * parâmetros (LRM-00116).
 */
export function buildOracleConnectEnv(config: OracleCliTarget): { LOCAL: string; TWO_TASK: string } {
  const descriptor = buildOracleConnectDescriptor(config);
  return { LOCAL: descriptor, TWO_TASK: descriptor };
}
