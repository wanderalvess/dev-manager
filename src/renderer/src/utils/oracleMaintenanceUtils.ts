export type OracleMaintenanceTab = 'health' | 'sqlplus' | 'datapump' | 'tns';

export const ORACLE_HEALTH_DIAGNOSE_MESSAGE =
  '>>> Executando db_health.sh (DIAGNÓSTICO)...\nAguarde a varredura de dba_objects...';

export const ORACLE_HEALTH_FIX_MESSAGE =
  '>>> Executando db_health.sh (--fix)...\nDropando SYS_PLSQL_* fantasmas e executando UTL_RECOMP...';

/** Remove a barra inicial que o Docker acrescenta ao nome do container. */
export function cleanContainerName(names: string): string {
  return names.replace(/^\//, '');
}

/** Texto exibido no terminal de saída: stdout, senão erro, senão placeholder. */
export function resolveOracleOutput(res: { output?: string; error?: string }): string {
  return res.output || res.error || '(Sem saída)';
}

export function formatOracleRunError(err: any): string {
  return `Erro: ${err?.message || err}`;
}

export function formatSqlPlusOpenError(err: any): string {
  return `Falha ao abrir SQL*Plus: ${err?.message || err}`;
}

export function buildDataPumpStartMessage(dumpfile: string): string {
  return `>>> Iniciando import_dump.sh (${dumpfile})...\nAguarde a execução de impdp e winthor_pos_import.sql...`;
}

/** Valor do <select> de dumps: vazio quando o arquivo digitado não está na lista. */
export function resolveDumpSelectValue(availableDumps: { name: string }[], dumpfile: string): string {
  return availableDumps.some((d) => d.name === dumpfile) ? dumpfile : '';
}

/** Dump inicial: primeiro da lista detectada ou o nome padrão. */
export function resolveInitialDumpfile(availableDumps: { name: string }[]): string {
  return availableDumps[0]?.name || 'backup.dmp';
}
