import React, { useState } from 'react';
import {
  Database,
  X,
  Activity,
  Terminal,
  FileText,
  Network,
  Shield,
  Wrench,
  Copy,
  RotateCw,
  FolderOpen,
  Play
} from 'lucide-react';
import type { DockerContainerInfo, WslDumpFileInfo } from '../../../../../shared/types';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { extractOraclePort, getOracleTnsConfig } from '../../../utils/dockerContainerUtils';

export interface OracleMaintenanceModalProps {
  container: DockerContainerInfo | null;
  availableDumps: WslDumpFileInfo[];
  isLoadingDumps: boolean;
  isOpeningDumpsFolder: boolean;
  onRefreshDumps: () => void;
  onOpenDumpsFolder: () => void;
  onClose: () => void;
  onError?: (msg: string) => void;
}

export const OracleMaintenanceModal: React.FC<OracleMaintenanceModalProps> = ({
  container,
  availableDumps,
  isLoadingDumps,
  isOpeningDumpsFolder,
  onRefreshDumps,
  onOpenDumpsFolder,
  onClose,
  onError
}) => {
  const [oracleActiveTab, setOracleActiveTab] = useState<'health' | 'sqlplus' | 'datapump' | 'tns'>('health');

  // Tab 1: Health
  const [oracleHealthSchema, setOracleHealthSchema] = useState<string>('');
  const [oracleHealthUser, setOracleHealthUser] = useState<string>('sys');
  const [oracleHealthPass, setOracleHealthPass] = useState<string>('pcinfo');
  const [isOracleHealthRunning, setIsOracleHealthRunning] = useState<boolean>(false);
  const [oracleHealthOutput, setOracleHealthOutput] = useState<string>('');
  const [oracleHealthSuccess, setOracleHealthSuccess] = useState<boolean | null>(null);

  // Tab 2: SQL*Plus
  const [oracleSqlUser, setOracleSqlUser] = useState<string>('sys');
  const [oracleSqlPass, setOracleSqlPass] = useState<string>('pcinfo');
  const [isOracleSqlOpening, setIsOracleSqlOpening] = useState<boolean>(false);

  // Tab 3: Data Pump
  const [dpDumpfile, setDpDumpfile] = useState<string>(() => availableDumps[0]?.name || 'backup.dmp');
  const [dpSchemaOrig, setDpSchemaOrig] = useState<string>('LOCAL');
  const [dpSchemaDest, setDpSchemaDest] = useState<string>('');
  const [dpCodclipc, setDpCodclipc] = useState<string>('-999');
  const [dpUser, setDpUser] = useState<string>('system');
  const [dpPass, setDpPass] = useState<string>('pcinfo');
  const [isDpRunning, setIsDpRunning] = useState<boolean>(false);
  const [dpOutput, setDpOutput] = useState<string>('');
  const [dpSuccess, setDpSuccess] = useState<boolean | null>(null);

  const { copy: copyLogsToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  if (!container) return null;

  const containerCleanName = container.names.replace(/^\//, '');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl h-[84vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-card/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                Manutenção Oracle WinThor
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                  {containerCleanName}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Utilitários integrados de <code className="text-[11px]">INFR-Docker</code> (/home/oracle/tools)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas com acabamento de precisão */}
        <div className="flex border-b border-border/70 px-5 gap-1 bg-muted/25 pt-2">
          <button
            onClick={() => setOracleActiveTab('health')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              oracleActiveTab === 'health'
                ? 'border-primary text-primary bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Saúde & Cura (db_health)</span>
          </button>

          <button
            onClick={() => setOracleActiveTab('sqlplus')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              oracleActiveTab === 'sqlplus'
                ? 'border-primary text-primary bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SQL*Plus Assistido</span>
          </button>

          <button
            onClick={() => {
              setOracleActiveTab('datapump');
              onRefreshDumps();
            }}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              oracleActiveTab === 'datapump'
                ? 'border-primary text-primary bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Importar Dump (Data Pump)</span>
          </button>

          <button
            onClick={() => setOracleActiveTab('tns')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer ${
              oracleActiveTab === 'tns'
                ? 'border-primary text-primary bg-card shadow-2xs'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Conexão TNS (tnsnames.ora)</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* TAB 1: SAÚDE (db_health.sh) */}
          {oracleActiveTab === 'health' && (
            <div className="space-y-4">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">Diagnóstico e Cura Pós-Import</strong>
                  Detecta objetos quebrados em <code className="text-foreground font-mono">dba_objects</code>, remove automaticamente types fantasmas <code className="text-foreground font-mono">SYS_PLSQL_*</code> e recompila packages em paralelo via <code className="text-foreground font-mono">UTL_RECOMP</code>.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Filtro de Schema (opcional)</label>
                  <input
                    type="text"
                    value={oracleHealthSchema}
                    onChange={(e) => setOracleHealthSchema(e.target.value)}
                    placeholder="Ex: LOCAL (vazio = todos)"
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Usuário DBA</label>
                  <input
                    type="text"
                    value={oracleHealthUser}
                    onChange={(e) => setOracleHealthUser(e.target.value)}
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Senha DBA</label>
                  <input
                    type="password"
                    value={oracleHealthPass}
                    onChange={(e) => setOracleHealthPass(e.target.value)}
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Botões de Ação com Hierarquia Clara */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={async () => {
                    if (!window.electronAPI?.execOracleHealth) return;
                    setIsOracleHealthRunning(true);
                    setOracleHealthSuccess(null);
                    setOracleHealthOutput('>>> Executando db_health.sh (DIAGNÓSTICO)...\nAguarde a varredura de dba_objects...');
                    try {
                      const res = await window.electronAPI.execOracleHealth(
                        containerCleanName,
                        oracleHealthSchema || undefined,
                        false,
                        oracleHealthUser,
                        oracleHealthPass
                      );
                      setOracleHealthSuccess(res.success);
                      setOracleHealthOutput(res.output || res.error || '(Sem saída)');
                    } catch (err: any) {
                      setOracleHealthSuccess(false);
                      setOracleHealthOutput(`Erro: ${err?.message || err}`);
                    } finally {
                      setIsOracleHealthRunning(false);
                    }
                  }}
                  disabled={isOracleHealthRunning}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-98 shadow-2xs"
                >
                  <Activity className={`w-3.5 h-3.5 ${isOracleHealthRunning ? 'animate-spin text-primary' : 'text-primary'}`} />
                  <span>Diagnosticar Apenas</span>
                </button>

                <button
                  onClick={async () => {
                    if (!window.electronAPI?.execOracleHealth) return;
                    setIsOracleHealthRunning(true);
                    setOracleHealthSuccess(null);
                    setOracleHealthOutput('>>> Executando db_health.sh (--fix)...\nDropando SYS_PLSQL_* fantasmas e executando UTL_RECOMP...');
                    try {
                      const res = await window.electronAPI.execOracleHealth(
                        containerCleanName,
                        oracleHealthSchema || undefined,
                        true,
                        oracleHealthUser,
                        oracleHealthPass
                      );
                      setOracleHealthSuccess(res.success);
                      setOracleHealthOutput(res.output || res.error || '(Sem saída)');
                    } catch (err: any) {
                      setOracleHealthSuccess(false);
                      setOracleHealthOutput(`Erro: ${err?.message || err}`);
                    } finally {
                      setIsOracleHealthRunning(false);
                    }
                  }}
                  disabled={isOracleHealthRunning}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Diagnosticar e Corrigir (--fix)</span>
                </button>

                {oracleHealthOutput && (
                  <button
                    onClick={() => copyLogsToClipboard(oracleHealthOutput, 'oracle-health-out')}
                    className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border/60 cursor-pointer transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copyFeedback === 'oracle-health-out' ? 'Copiado!' : 'Copiar Saída'}</span>
                  </button>
                )}
              </div>

              {/* Terminal de Saída Industrial */}
              {oracleHealthOutput && (
                <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-inner">
                  <div className="bg-[#090D14] px-3.5 py-2 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      <span className="text-[10px] font-mono text-muted-foreground ml-2">db_health output</span>
                    </div>
                    {oracleHealthSuccess !== null && (
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                          oracleHealthSuccess
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {oracleHealthSuccess ? 'SUCESSO' : 'ATENÇÃO'}
                      </span>
                    )}
                  </div>
                  <pre className="bg-[#090D14] p-4 text-[11px] font-mono text-emerald-400 overflow-auto max-h-72 whitespace-pre-wrap leading-relaxed select-text [scrollbar-width:thin]">
                    {oracleHealthOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SQL*PLUS */}
          {oracleActiveTab === 'sqlplus' && (
            <div className="space-y-4">
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">Terminal Interativo SQL*Plus</strong>
                  Abre instantaneamente o Windows Terminal ou CMD executando <code className="text-foreground font-mono">sqlplus_conn.sh</code> com conexão TCP nativa <code className="text-foreground font-mono">//localhost:1521/XE</code>.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Usuário de Acesso</label>
                  <input
                    type="text"
                    value={oracleSqlUser}
                    onChange={(e) => setOracleSqlUser(e.target.value)}
                    placeholder="sys ou system"
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Conexão como <span className="font-mono text-foreground font-semibold">sys</span> eleva automaticamente para AS SYSDBA.</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Senha</label>
                  <input
                    type="password"
                    value={oracleSqlPass}
                    onChange={(e) => setOracleSqlPass(e.target.value)}
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={async () => {
                    if (!window.electronAPI?.openOracleSqlPlus) return;
                    setIsOracleSqlOpening(true);
                    try {
                      await window.electronAPI.openOracleSqlPlus(
                        containerCleanName,
                        oracleSqlUser,
                        oracleSqlPass
                      );
                    } catch (err: any) {
                      onError?.(`Falha ao abrir SQL*Plus: ${err?.message || err}`);
                    } finally {
                      setIsOracleSqlOpening(false);
                    }
                  }}
                  disabled={isOracleSqlOpening}
                  className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <Terminal className="w-4 h-4" />
                  <span>{isOracleSqlOpening ? 'Abrindo Terminal...' : 'Abrir Sessão SQL*Plus no Terminal'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DATA PUMP */}
          {oracleActiveTab === 'datapump' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground font-semibold block mb-0.5">Automação de Importação Data Pump (impdp)</strong>
                    Importa arquivos posicionados no diretório compartilhado <code className="text-foreground font-mono">/opt/dumps</code>. Executa <code className="text-foreground font-mono">table_exists_action=REPLACE</code>, roda o script <code className="text-foreground font-mono">winthor_pos_import.sql</code> e coleta estatísticas de schema.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenDumpsFolder}
                  disabled={isOpeningDumpsFolder}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-98"
                  title="Abre a pasta \\wsl$\distro\opt\dumps no Windows Explorer para copiar dumps"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{isOpeningDumpsFolder ? 'Abrindo...' : 'Abrir /opt/dumps no Explorer'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Arquivo Dump (.dmp)</label>
                    <button
                      type="button"
                      onClick={onRefreshDumps}
                      disabled={isLoadingDumps}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition"
                      title="Atualizar lista de dumps encontrados em /opt/dumps"
                    >
                      <RotateCw className={`w-2.5 h-2.5 ${isLoadingDumps ? 'animate-spin text-primary' : ''}`} />
                      <span>{isLoadingDumps ? 'Buscando...' : 'Atualizar Dumps'}</span>
                    </button>
                  </div>

                  {availableDumps.length > 0 && (
                    <div className="mb-1.5">
                      <select
                        value={availableDumps.some((d) => d.name === dpDumpfile) ? dpDumpfile : ''}
                        onChange={(e) => {
                          if (e.target.value) setDpDumpfile(e.target.value);
                        }}
                        className="w-full bg-muted/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="" disabled>Selecionar dump de /opt/dumps ({availableDumps.length} detectados)...</option>
                        {availableDumps.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name} ({d.formattedSize})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    type="text"
                    value={dpDumpfile}
                    onChange={(e) => setDpDumpfile(e.target.value)}
                    placeholder="ex: backup.dmp"
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Pasta WSL: <code className="font-mono text-foreground font-semibold">/opt/dumps</code> ↔ Container: <code className="font-mono text-foreground">/home/oracle/dumps</code>.
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-muted-foreground block">CODCLIPC (Cliente WinThor)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDpCodclipc('-999')}
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono cursor-pointer transition ${
                          dpCodclipc === '-999'
                            ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                        title="Código padrão TOTVS para desenvolvimento (-999)"
                      >
                        -999 (TOTVS)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDpCodclipc('9999')}
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono cursor-pointer transition ${
                          dpCodclipc === '9999'
                            ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                        title="Código legado comum (9999)"
                      >
                        9999
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={dpCodclipc}
                    onChange={(e) => setDpCodclipc(e.target.value)}
                    placeholder="-999"
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Schema de Origem</label>
                  <input
                    type="text"
                    value={dpSchemaOrig}
                    onChange={(e) => setDpSchemaOrig(e.target.value)}
                    placeholder="LOCAL"
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Schema de Destino (opcional - Remap)</label>
                  <input
                    type="text"
                    value={dpSchemaDest}
                    onChange={(e) => setDpSchemaDest(e.target.value)}
                    placeholder="Vazio = substitui schema de origem"
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Usuário DBA</label>
                  <input
                    type="text"
                    value={dpUser}
                    onChange={(e) => setDpUser(e.target.value)}
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Senha</label>
                  <input
                    type="password"
                    value={dpPass}
                    onChange={(e) => setDpPass(e.target.value)}
                    className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (!window.electronAPI?.execOracleDataPump) return;
                    setIsDpRunning(true);
                    setDpSuccess(null);
                    setDpOutput(`>>> Iniciando import_dump.sh (${dpDumpfile})...\nAguarde a execução de impdp e winthor_pos_import.sql...`);
                    try {
                      const res = await window.electronAPI.execOracleDataPump({
                        containerName: containerCleanName,
                        user: dpUser,
                        password: dpPass,
                        dumpfile: dpDumpfile,
                        schemaOrig: dpSchemaOrig,
                        schemaDest: dpSchemaDest || undefined,
                        codclipc: dpCodclipc
                      });
                      setDpSuccess(res.success);
                      setDpOutput(res.output || res.error || '(Sem saída)');
                    } catch (err: any) {
                      setDpSuccess(false);
                      setDpOutput(`Erro: ${err?.message || err}`);
                    } finally {
                      setIsDpRunning(false);
                    }
                  }}
                  disabled={isDpRunning || !dpDumpfile || !dpSchemaOrig}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isDpRunning ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{isDpRunning ? 'Importando Dump...' : 'Iniciar Importação Data Pump'}</span>
                </button>

                {dpOutput && (
                  <button
                    onClick={() => copyLogsToClipboard(dpOutput, 'oracle-dp-out')}
                    className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border/60 cursor-pointer transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copyFeedback === 'oracle-dp-out' ? 'Copiado!' : 'Copiar Saída'}</span>
                  </button>
                )}
              </div>

              {/* Terminal de Saída Data Pump Industrial */}
              {dpOutput && (
                <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-inner">
                  <div className="bg-[#090D14] px-3.5 py-2 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      <span className="text-[10px] font-mono text-muted-foreground ml-2">import_dump output</span>
                    </div>
                    {dpSuccess !== null && (
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                          dpSuccess
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {dpSuccess ? 'IMPORT CONCLUÍDO' : 'FALHA NO IMPORT'}
                      </span>
                    )}
                  </div>
                  <pre className="bg-[#090D14] p-4 text-[11px] font-mono text-emerald-400 overflow-auto max-h-72 whitespace-pre-wrap leading-relaxed select-text [scrollbar-width:thin]">
                    {dpOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONEXÃO TNS (tnsnames.ora) */}
          {oracleActiveTab === 'tns' && (
            <div className="space-y-4">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Network className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground font-semibold block mb-0.5">Atalho de Conexão TNS (Oracle Database 11g XE)</strong>
                  Adicione este bloco ao seu arquivo <code className="text-foreground font-mono">tnsnames.ora</code> para conectar ferramentas de desenvolvimento (PL/SQL Developer, DBeaver, DFe, WTA, Rotinas WinThor) ao banco local via TCP nativo.
                </div>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                    <span>Bloco de Configuração (tnsnames.ora)</span>
                  </span>
                  <button
                    onClick={() => {
                      const port = extractOraclePort(container?.ports);
                      copyLogsToClipboard(getOracleTnsConfig(port), 'oracle-tns-modal');
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition shadow-sm cursor-pointer active:scale-98"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copyFeedback === 'oracle-tns-modal' ? 'Copiado!' : 'Copiar Bloco TNS'}</span>
                  </button>
                </div>

                <pre className="bg-[#090D14] p-3.5 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all border border-border/60">
{getOracleTnsConfig(extractOraclePort(container?.ports))}
                </pre>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-muted-foreground">
                  <div className="p-2.5 bg-muted/40 rounded-lg border border-border/50">
                    <span className="font-semibold text-foreground block mb-0.5">Localização típica no Windows:</span>
                    <code className="font-mono text-[10px] break-all text-foreground/80">C:\oracle\product\...\network\admin\tnsnames.ora</code>
                  </div>
                  <div className="p-2.5 bg-muted/40 rounded-lg border border-border/50">
                    <span className="font-semibold text-foreground block mb-0.5">Credenciais Padrão (INFR-Docker):</span>
                    <div className="font-mono text-[10px] text-foreground/80">DBA: <span className="text-foreground font-bold">system</span> / Senha: <span className="text-foreground font-bold">pcinfo</span></div>
                    <div className="font-mono text-[10px] text-foreground/80">SYSDBA: <span className="text-foreground font-bold">sys</span> / Senha: <span className="text-foreground font-bold">pcinfo</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Comandos executados nativamente via container engine
          </span>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
