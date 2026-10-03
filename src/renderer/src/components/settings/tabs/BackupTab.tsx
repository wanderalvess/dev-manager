import React from 'react';
import {
  HardDriveDownload,
  Database,
  FolderOpen,
  RotateCcw,
  Network
} from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';

interface BackupTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  handleBrowseFile: (field: keyof AppSettings) => Promise<void>;
}

export const BackupTab: React.FC<BackupTabProps> = ({
  settings,
  setSettings,
  handleBrowseFile
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1" id="field-backup">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <HardDriveDownload className="w-4 h-4 text-sky-500" /> Executáveis de Backup
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Opcional se já estiverem no PATH</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Usados pela função de Backup da aba <strong>Banco de Dados</strong>. Deixe em branco se o executável já
            estiver acessível no PATH do sistema.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* pg_dump */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-500" /> pg_dump (Postgres)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.pgDumpPath || ''}
                  onChange={(e) => setSettings({ ...settings, pgDumpPath: e.target.value })}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseFile('pgDumpPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                  title="Selecionar executável"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
                </button>
              </div>
            </div>

            {/* expdp */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-rose-500" /> expdp (Oracle)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.expdpPath || ''}
                  onChange={(e) => setSettings({ ...settings, expdpPath: e.target.value })}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\oracle\instantclient\expdp.exe"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseFile('expdpPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                  title="Selecionar executável"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>

            {/* mysqldump */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-500" /> mysqldump (MySQL)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.mysqldumpPath || ''}
                  onChange={(e) => setSettings({ ...settings, mysqldumpPath: e.target.value })}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseFile('mysqldumpPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                  title="Selecionar executável"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-500" /> Executáveis de Restauração
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Opcional se já estiverem no PATH</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* psql */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-500" /> psql (Postgres)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.psqlPath || ''}
                  onChange={(e) => setSettings({ ...settings, psqlPath: e.target.value })}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\Program Files\PostgreSQL\17\bin\psql.exe"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseFile('psqlPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                  title="Selecionar executável"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
                </button>
              </div>
            </div>

            {/* impdp */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-rose-500" /> impdp (Oracle)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.impdpPath || ''}
                  onChange={(e) => setSettings({ ...settings, impdpPath: e.target.value })}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\oracle\instantclient\impdp.exe"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseFile('impdpPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                  title="Selecionar executável"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>

            {/* mysql */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-500" /> mysql (Cliente MySQL)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.mysqlPath || ''}
                  onChange={(e) => setSettings({ ...settings, mysqlPath: e.target.value })}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseFile('mysqlPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm"
                  title="Selecionar executável"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Configuração de Rede Oracle & tnsnames.ora */}
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border" id="field-oracleTnsnames">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Network className="w-4 h-4 text-orange-500" /> Rede Oracle & tnsnames.ora
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Busca de conexões & TNS_ADMIN</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Caminho do arquivo <span className="font-mono text-foreground font-semibold">tnsnames.ora</span> utilizado pelo DB Studio para importar e preencher automaticamente os dados de conexão do Oracle (Host, Porta, Service Name e SID).
          </p>

          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-foreground flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-orange-500" /> Arquivo de Configuração (tnsnames.ora)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={settings.oracleTnsnamesPath || ''}
                onChange={(e) => setSettings({ ...settings, oracleTnsnamesPath: e.target.value })}
                className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                placeholder="Ex: C:\oracle\product\11.2.0\dbhome_1\network\admin\tnsnames.ora"
              />
              <button
                type="button"
                onClick={() => handleBrowseFile('oracleTnsnamesPath')}
                className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all shrink-0 shadow-sm cursor-pointer"
                title="Selecionar arquivo tnsnames.ora"
              >
                <FolderOpen className="w-3.5 h-3.5 text-orange-500" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Também define automaticamente o diretório <span className="font-mono text-foreground font-semibold">TNS_ADMIN</span> para resoluções nativas do driver Oracle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
