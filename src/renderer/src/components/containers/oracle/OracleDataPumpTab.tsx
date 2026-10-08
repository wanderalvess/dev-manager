import React from 'react';
import { FileText, FolderOpen, Play, RotateCw } from 'lucide-react';
import type { WslDumpFileInfo } from '../../../../../shared/types';
import type { OracleMaintenanceModalState } from '../../../hooks/containers/useOracleMaintenanceModal';
import { resolveDumpSelectValue } from '../../../utils/oracleMaintenanceUtils';
import { OracleCopyOutputButton } from './OracleCopyOutputButton';
import { OracleOutputTerminal } from './OracleOutputTerminal';

interface OracleDataPumpTabProps {
  dp: OracleMaintenanceModalState['dp'];
  availableDumps: WslDumpFileInfo[];
  isLoadingDumps: boolean;
  isOpeningDumpsFolder: boolean;
  onRefreshDumps: () => void;
  onOpenDumpsFolder: () => void;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

const codclipcButtonClass = (active: boolean) =>
  `text-2xs px-1.5 py-0.2 rounded font-mono cursor-pointer transition ${
    active
      ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
  }`;

export const OracleDataPumpTab: React.FC<OracleDataPumpTabProps> = ({
  dp,
  availableDumps,
  isLoadingDumps,
  isOpeningDumpsFolder,
  onRefreshDumps,
  onOpenDumpsFolder,
  copiedKey,
  onCopy
}) => (
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
            className="text-2xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition"
            title="Atualizar lista de dumps encontrados em /opt/dumps"
          >
            <RotateCw className={`w-2.5 h-2.5 ${isLoadingDumps ? 'animate-spin text-primary' : ''}`} />
            <span>{isLoadingDumps ? 'Buscando...' : 'Atualizar Dumps'}</span>
          </button>
        </div>

        {availableDumps.length > 0 && (
          <div className="mb-1.5">
            <select
              value={resolveDumpSelectValue(availableDumps, dp.dumpfile)}
              onChange={(e) => {
                if (e.target.value) dp.setDumpfile(e.target.value);
              }}
              className="w-full bg-muted/40 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
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
          value={dp.dumpfile}
          onChange={(e) => dp.setDumpfile(e.target.value)}
          placeholder="ex: backup.dmp"
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        <p className="text-2xs text-muted-foreground mt-1">
          Pasta WSL: <code className="font-mono text-foreground font-semibold">/opt/dumps</code> ↔ Container: <code className="font-mono text-foreground">/home/oracle/dumps</code>.
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-muted-foreground block">CODCLIPC (Cliente WinThor)</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => dp.setCodclipc('-999')}
              className={codclipcButtonClass(dp.codclipc === '-999')}
              title="Código padrão TOTVS para desenvolvimento (-999)"
            >
              -999 (TOTVS)
            </button>
            <button
              type="button"
              onClick={() => dp.setCodclipc('9999')}
              className={codclipcButtonClass(dp.codclipc === '9999')}
              title="Código legado comum (9999)"
            >
              9999
            </button>
          </div>
        </div>
        <input
          type="text"
          value={dp.codclipc}
          onChange={(e) => dp.setCodclipc(e.target.value)}
          placeholder="-999"
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Schema de Origem</label>
        <input
          type="text"
          value={dp.schemaOrig}
          onChange={(e) => dp.setSchemaOrig(e.target.value)}
          placeholder="LOCAL"
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground uppercase focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Schema de Destino (opcional - Remap)</label>
        <input
          type="text"
          value={dp.schemaDest}
          onChange={(e) => dp.setSchemaDest(e.target.value)}
          placeholder="Vazio = substitui schema de origem"
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground uppercase focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Usuário DBA</label>
        <input
          type="text"
          value={dp.user}
          onChange={(e) => dp.setUser(e.target.value)}
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Senha</label>
        <input
          type="password"
          value={dp.pass}
          onChange={(e) => dp.setPass(e.target.value)}
          className="w-full bg-card border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>

    <div className="pt-2 flex items-center gap-3">
      <button
        onClick={dp.run}
        disabled={dp.isRunning || !dp.dumpfile || !dp.schemaOrig}
        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
      >
        {dp.isRunning ? (
          <RotateCw className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
        <span>{dp.isRunning ? 'Importando Dump...' : 'Iniciar Importação Data Pump'}</span>
      </button>

      {dp.output && (
        <OracleCopyOutputButton
          copied={copiedKey === 'oracle-dp-out'}
          onCopy={() => onCopy(dp.output, 'oracle-dp-out')}
        />
      )}
    </div>

    {/* Terminal de Saída Data Pump Industrial */}
    {dp.output && (
      <OracleOutputTerminal
        title="import_dump output"
        output={dp.output}
        success={dp.success}
        successLabel="IMPORT CONCLUÍDO"
        failLabel="FALHA NO IMPORT"
      />
    )}
  </div>
);
