import { useState } from 'react';
import type { DockerContainerInfo, WslDumpFileInfo } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import {
  ORACLE_HEALTH_DIAGNOSE_MESSAGE,
  ORACLE_HEALTH_FIX_MESSAGE,
  buildDataPumpStartMessage,
  cleanContainerName,
  formatOracleRunError,
  formatSqlPlusOpenError,
  resolveInitialDumpfile,
  resolveOracleOutput,
  type OracleMaintenanceTab
} from '../../utils/oracleMaintenanceUtils';

interface UseOracleMaintenanceModalParams {
  container: DockerContainerInfo | null;
  availableDumps: WslDumpFileInfo[];
  onError?: (msg: string) => void;
}

export function useOracleMaintenanceModal({
  container,
  availableDumps,
  onError
}: UseOracleMaintenanceModalParams) {
  const [activeTab, setActiveTab] = useState<OracleMaintenanceTab>('health');

  // Tab 1: Health
  const [healthSchema, setHealthSchema] = useState<string>('');
  const [healthUser, setHealthUser] = useState<string>('sys');
  const [healthPass, setHealthPass] = useState<string>('pcinfo');
  const [isHealthRunning, setIsHealthRunning] = useState<boolean>(false);
  const [healthOutput, setHealthOutput] = useState<string>('');
  const [healthSuccess, setHealthSuccess] = useState<boolean | null>(null);

  // Tab 2: SQL*Plus
  const [sqlUser, setSqlUser] = useState<string>('sys');
  const [sqlPass, setSqlPass] = useState<string>('pcinfo');
  const [isSqlOpening, setIsSqlOpening] = useState<boolean>(false);

  // Tab 3: Data Pump
  const [dpDumpfile, setDpDumpfile] = useState<string>(() => resolveInitialDumpfile(availableDumps));
  const [dpSchemaOrig, setDpSchemaOrig] = useState<string>('LOCAL');
  const [dpSchemaDest, setDpSchemaDest] = useState<string>('');
  const [dpCodclipc, setDpCodclipc] = useState<string>('-999');
  const [dpUser, setDpUser] = useState<string>('system');
  const [dpPass, setDpPass] = useState<string>('pcinfo');
  const [isDpRunning, setIsDpRunning] = useState<boolean>(false);
  const [dpOutput, setDpOutput] = useState<string>('');
  const [dpSuccess, setDpSuccess] = useState<boolean | null>(null);

  const { copy, copiedKey } = useCopyToClipboard();

  const containerName = container ? cleanContainerName(container.names) : '';

  const runHealth = async (fix: boolean) => {
    if (!window.electronAPI?.execOracleHealth) return;
    setIsHealthRunning(true);
    setHealthSuccess(null);
    setHealthOutput(fix ? ORACLE_HEALTH_FIX_MESSAGE : ORACLE_HEALTH_DIAGNOSE_MESSAGE);
    try {
      const res = await window.electronAPI.execOracleHealth(
        containerName,
        healthSchema || undefined,
        fix,
        healthUser,
        healthPass
      );
      setHealthSuccess(res.success);
      setHealthOutput(resolveOracleOutput(res));
    } catch (err: any) {
      setHealthSuccess(false);
      setHealthOutput(formatOracleRunError(err));
    } finally {
      setIsHealthRunning(false);
    }
  };

  const openSqlPlus = async () => {
    if (!window.electronAPI?.openOracleSqlPlus) return;
    setIsSqlOpening(true);
    try {
      await window.electronAPI.openOracleSqlPlus(containerName, sqlUser, sqlPass);
    } catch (err: any) {
      onError?.(formatSqlPlusOpenError(err));
    } finally {
      setIsSqlOpening(false);
    }
  };

  const runDataPump = async () => {
    if (!window.electronAPI?.execOracleDataPump) return;
    setIsDpRunning(true);
    setDpSuccess(null);
    setDpOutput(buildDataPumpStartMessage(dpDumpfile));
    try {
      const res = await window.electronAPI.execOracleDataPump({
        containerName,
        user: dpUser,
        password: dpPass,
        dumpfile: dpDumpfile,
        schemaOrig: dpSchemaOrig,
        schemaDest: dpSchemaDest || undefined,
        codclipc: dpCodclipc
      });
      setDpSuccess(res.success);
      setDpOutput(resolveOracleOutput(res));
    } catch (err: any) {
      setDpSuccess(false);
      setDpOutput(formatOracleRunError(err));
    } finally {
      setIsDpRunning(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    containerName,
    copy,
    copiedKey,
    health: {
      schema: healthSchema,
      setSchema: setHealthSchema,
      user: healthUser,
      setUser: setHealthUser,
      pass: healthPass,
      setPass: setHealthPass,
      isRunning: isHealthRunning,
      output: healthOutput,
      success: healthSuccess,
      run: runHealth
    },
    sql: {
      user: sqlUser,
      setUser: setSqlUser,
      pass: sqlPass,
      setPass: setSqlPass,
      isOpening: isSqlOpening,
      open: openSqlPlus
    },
    dp: {
      dumpfile: dpDumpfile,
      setDumpfile: setDpDumpfile,
      schemaOrig: dpSchemaOrig,
      setSchemaOrig: setDpSchemaOrig,
      schemaDest: dpSchemaDest,
      setSchemaDest: setDpSchemaDest,
      codclipc: dpCodclipc,
      setCodclipc: setDpCodclipc,
      user: dpUser,
      setUser: setDpUser,
      pass: dpPass,
      setPass: setDpPass,
      isRunning: isDpRunning,
      output: dpOutput,
      success: dpSuccess,
      run: runDataPump
    }
  };
}

export type OracleMaintenanceModalState = ReturnType<typeof useOracleMaintenanceModal>;
