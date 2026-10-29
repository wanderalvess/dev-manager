/**
 * Connect string para os utilitários de linha de comando do Oracle (exp, imp, expdp, impdp).
 *
 * O formato curto `host:porta/serviço` não serve aqui: `exp`/`expdp` leem a `/` do argumento
 * `usuario@host:porta/servico` como separador de usuário e senha, o serviço se perde e o
 * listener responde ORA-12504. O descritor completo não tem barra e funciona do 11g em diante,
 * também no modo SID, que o formato curto nem suporta.
 */
export function buildOracleCliConnectString(config: {
  host?: string;
  port?: number | string;
  database?: string;
  oracleMode?: 'serviceName' | 'sid';
}): string {
  const port = config.port || 1521;
  const target = config.oracleMode === 'sid' ? `SID=${config.database || ''}` : `SERVICE_NAME=${config.database || ''}`;
  return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${config.host || ''})(PORT=${port}))(CONNECT_DATA=(${target})))`;
}
