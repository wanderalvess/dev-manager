import type { SqlSnippet } from '../../../shared/types';

export const DEFAULT_SQL_SNIPPETS: SqlSnippet[] = [
  {
    id: 'oracle-active-sessions',
    title: 'Sessões Ativas no Banco (V$SESSION)',
    category: 'Oracle - Diagnóstico',
    description: 'Identifica sessões em execução no banco de dados',
    sql: "SELECT SID, SERIAL#, USERNAME, STATUS, OSUSER, MACHINE, PROGRAM FROM V$SESSION WHERE STATUS = 'ACTIVE' AND USERNAME IS NOT NULL",
    dbType: 'oracle'
  },
  {
    id: 'oracle-locks',
    title: 'Objetos Bloqueados (Locks)',
    category: 'Oracle - Diagnóstico',
    description: 'Diagnostica bloqueios em tabelas e concorrência no Oracle',
    sql: "SELECT L.SESSION_ID, S.SERIAL#, S.USERNAME, S.OSUSER, O.OBJECT_NAME, L.LOCKED_MODE FROM V$LOCKED_OBJECT L JOIN DBA_OBJECTS O ON L.OBJECT_ID = O.OBJECT_ID JOIN V$SESSION S ON L.SESSION_ID = S.SID",
    dbType: 'oracle'
  },
  {
    id: 'oracle-tablespaces',
    title: 'Uso de Tablespaces e Disco',
    category: 'Oracle - Infraestrutura',
    description: 'Verifica espaço alocado por tablespace',
    sql: "SELECT TABLESPACE_NAME, ROUND(SUM(BYTES)/(1024*1024), 2) AS TOTAL_MB FROM DBA_DATA_FILES GROUP BY TABLESPACE_NAME",
    dbType: 'oracle'
  }
];
