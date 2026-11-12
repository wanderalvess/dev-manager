import React, { useEffect, useState } from 'react';
import { ScrollText, RefreshCw } from 'lucide-react';

export const LogsPage: React.FC<{ onNavigateToSettings: () => void; isActive: boolean; settingsVersion: number }> = () => {
  const [lines, setLines] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [level, setLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  const load = async () => {
    const res = await fetch('/api/logs/lines').then((r) => r.json());
    setLines(res.lines || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = lines.filter((l) => {
    if (level !== 'ALL' && l.level !== level) return false;
    if (!filter.trim()) return true;
    return `${l.logger} ${l.message}`.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col p-5 gap-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" /> Logs em Tempo Real
          </h1>
          <p className="text-xs text-muted-foreground">Monitoramento contínuo de karaf.log e exceções WinThor/OSGi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLevel(lv)}
              className={`px-2.5 py-1 rounded-lg text-2xs font-bold cursor-pointer ${
                level === lv ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
              }`}
            >
              {lv}
            </button>
          ))}
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar logger ou mensagem..."
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs w-56"
          />
          <button type="button" onClick={() => void load()} aria-label="Atualizar logs" title="Atualizar logs" className="p-2 rounded-xl border border-border bg-card hover:bg-muted cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#070b12] border border-border rounded-xl p-4 overflow-y-auto font-mono text-xs space-y-1.5">
        {filtered.map((l) => (
          <div key={l.id} className="flex items-start gap-2 leading-relaxed">
            <span className="text-slate-500 shrink-0">{l.timestamp}</span>
            <span className={`px-1.5 rounded text-2xs font-bold shrink-0 ${
              l.level === 'ERROR' ? 'bg-red-500/20 text-red-400' : l.level === 'WARN' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
            }`}>
              {l.level}
            </span>
            <span className="text-slate-400 shrink-0">{l.logger}</span>
            <span className="text-slate-100 break-all">{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
