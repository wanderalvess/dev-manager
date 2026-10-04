import React, { useState } from 'react';
import {
  extractSqlVariables,
  castBindValue,
  substituteBindVariables,
  loadBindCache,
  saveBindCache,
  BindInputState
} from '../../utils/sqlBinds';

interface UseDatabaseBindsParams {
  sql: string;
  setSql: React.Dispatch<React.SetStateAction<string>>;
  /** Executa o SQL já com as variáveis resolvidas (overrideBinds evita reabrir o modal). */
  onExecute: (sql: string, overrideBinds: Record<string, any>) => void;
}

function buildInitialInputs(cleanSql: string): BindInputState[] {
  const detailed = extractSqlVariables(cleanSql);
  const cache = loadBindCache();
  return detailed.map((item) => ({
    name: item.name,
    prefix: item.prefix,
    raw: item.raw,
    value: cache[item.name] ?? '',
    type: 'auto'
  }));
}

/** Modal de variáveis de bind (:PARAM, &VAR, @VAR, ${VAR}) e seus fluxos de execução/substituição. */
export function useDatabaseBinds({ sql, setSql, onExecute }: UseDatabaseBindsParams) {
  const [isBindModalOpen, setIsBindModalOpen] = useState<boolean>(false);
  const [bindInputs, setBindInputs] = useState<BindInputState[]>([]);
  const [pendingSqlToExecute, setPendingSqlToExecute] = useState<string | null>(null);

  /** Abre o modal se o SQL tiver variáveis; retorna true quando a execução deve aguardar o usuário. */
  const promptIfHasVariables = (cleanSql: string): boolean => {
    if (extractSqlVariables(cleanSql).length === 0) return false;
    setBindInputs(buildInitialInputs(cleanSql));
    setPendingSqlToExecute(cleanSql);
    setIsBindModalOpen(true);
    return true;
  };

  const handleOpenBindModalManually = () => {
    const cleanSql = sql.trim().replace(/;+\s*$/, '');
    setBindInputs(buildInitialInputs(cleanSql));
    setPendingSqlToExecute(cleanSql || sql);
    setIsBindModalOpen(true);
  };

  const handleConfirmExecuteBinds = (e?: React.FormEvent) => {
    e?.preventDefault();
    const sqlToRun = pendingSqlToExecute || sql;
    const bindsRecord: Record<string, any> = {};
    const cacheToSave: Record<string, string> = {};

    for (const item of bindInputs) {
      bindsRecord[item.name] = castBindValue(item.value, item.type);
      if (item.value) {
        cacheToSave[item.name] = item.value;
      }
    }

    saveBindCache(cacheToSave);
    setIsBindModalOpen(false);

    // Se a consulta possui variáveis de substituição (&VAR, @VAR, ${VAR}),
    // interpolamos com os literais formatados para evitar erros de sintaxe (ex: ORA-00911).
    const hasSubstitutionVars = /(?<!&)&(?!=)[a-zA-Z_]|&&[a-zA-Z_]|@[a-zA-Z_]|\$\{[a-zA-Z_]|#\{[a-zA-Z_]/.test(sqlToRun);
    if (hasSubstitutionVars) {
      const bindsForSub: Record<string, { value: any; type: any }> = {};
      for (const item of bindInputs) {
        bindsForSub[item.name] = { value: item.value, type: item.type };
      }
      onExecute(substituteBindVariables(sqlToRun, bindsForSub), {});
    } else {
      onExecute(sqlToRun, bindsRecord);
    }
  };

  const handleSubstituteBindsInline = () => {
    const sqlToRun = pendingSqlToExecute || sql;
    const bindsRecord: Record<string, { value: any; type: any }> = {};
    const cacheToSave: Record<string, string> = {};

    for (const item of bindInputs) {
      bindsRecord[item.name] = { value: item.value, type: item.type };
      if (item.value) {
        cacheToSave[item.name] = item.value;
      }
    }

    saveBindCache(cacheToSave);
    setSql(substituteBindVariables(sqlToRun, bindsRecord));
    setIsBindModalOpen(false);
  };

  return {
    isBindModalOpen,
    setIsBindModalOpen,
    bindInputs,
    setBindInputs,
    promptIfHasVariables,
    handleOpenBindModalManually,
    handleConfirmExecuteBinds,
    handleSubstituteBindsInline
  };
}
