import React, { useEffect, useState } from 'react';
import { HardDriveDownload, Play, Clock, FileArchive, History, Bell, ArrowLeft } from 'lucide-react';
import { showToast } from '../components/ToastHost';

export const BackupsPage: React.FC<{
  isActive: boolean;
  settingsVersion: number;
  onNavigateToDatabase: () => void;
}> = ({ onNavigateToDatabase }) => {
  const [tab, setTab] = useState<'run' | 'schedule' | 'files' | 'history' | 'webhooks'>('run');
  const [data, setData] = useState<{ files: any[]; history: any[]; configs: any[]; webhooks: any[] }>({
    files: [],
    history: [],
    configs: [],
    webhooks: []
  });
  const [running, setRunning] = useState(false);
  const [lastOutput, setLastOutput] = useState('');

  const load = async () => {
    const res = await fetch('/api/db/backups').then((r) => r.json());
    setData(res);
  };

  useEffect(() => {
    void load();
  }, []);

  const runBackup = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/db/backups/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: 'conn-oracle-dev' })
      }).then((r) => r.json());
      setLastOutput(res.output || '');
      showToast(`Backup gerado: ${res.fileName}`, 'success');
      await load();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <HardDriveDownload className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-extrabold text-foreground">Central de Backup &amp; Restauração</h1>
            <p className="text-xs text-muted-foreground">Snapshots Oracle/Postgres/MySQL, agendamentos Cron e auditoria SHA-256.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateToDatabase}
          className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Studio SQL
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {[
          { id: 'run', label: 'Executar Backup', icon: Play },
          { id: 'schedule', label: 'Agendamento', icon: Clock },
          { id: 'files', label: `Arquivos (${data.files.length})`, icon: FileArchive },
          { id: 'history', label: `Histórico (${data.history.length})`, icon: History },
          { id: 'webhooks', label: 'Webhooks', icon: Bell }
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:bg-muted text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'run' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">WinThor Dev (Oracle XE)</h2>
              <p className="text-2xs text-muted-foreground font-mono">expdp WINTHOR@localhost:1521/XEPDB1 directory=DATA_PUMP_DIR</p>
            </div>
            <button
              type="button"
              onClick={runBackup}
              disabled={running}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> {running ? 'Gerando...' : 'Disparar Backup Agora'}
            </button>
          </div>
          {lastOutput && (
            <pre className="p-3 rounded-xl bg-[#070b12] text-slate-200 font-mono text-2xs whitespace-pre-wrap">{lastOutput}</pre>
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {data.files.map((f) => (
            <div key={f.fileName} className="p-3.5 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-mono font-bold text-foreground">{f.fileName}</div>
                <div className="text-2xs font-mono text-muted-foreground">SHA-256: {f.sha256?.slice(0, 24)}...</div>
              </div>
              <div className="text-right font-mono text-2xs text-muted-foreground">
                <div>{(f.sizeBytes / 1048576).toFixed(1)} MB</div>
                <div>{new Date(f.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2.5">
          {data.history.map((h) => (
            <div key={h.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">{h.connectionName} — {h.fileName}</span>
                <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-2xs font-bold uppercase">{h.status}</span>
              </div>
              <pre className="p-2.5 rounded-lg bg-muted/40 font-mono text-2xs text-muted-foreground whitespace-pre-wrap">{h.output}</pre>
            </div>
          ))}
        </div>
      )}

      {tab === 'schedule' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-xs">
          {data.configs.map((cfg) => (
            <div key={cfg.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <div className="font-bold text-foreground">Cron: <span className="font-mono text-primary">{cfg.cronExpression}</span></div>
                <div className="text-2xs text-muted-foreground">Retenção: {cfg.maxAgeDays} dias / máximo {cfg.maxCount} arquivos</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-2xs font-bold">ATIVO</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-xs">
          {data.webhooks.map((w) => (
            <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <div className="font-bold text-foreground">{w.name} ({w.provider})</div>
                <div className="text-2xs font-mono text-muted-foreground">{w.url}</div>
              </div>
              <span className="text-2xs text-muted-foreground">{w.enabled ? 'Ativo' : 'Desativado'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
