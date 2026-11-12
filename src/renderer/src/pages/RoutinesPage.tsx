import React, { useEffect, useState } from 'react';
import { Grid, Star, Play } from 'lucide-react';
import type { RoutineItem } from '../../../shared/types';
import { showToast } from '../components/ToastHost';

export const RoutinesPage: React.FC<{
  onNavigateToSettings: () => void;
  onNavigateToEnv: () => void;
  settingsVersion: number;
}> = () => {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.electronAPI.listRoutines().then((r) => Array.isArray(r) && setRoutines(r)).catch(() => {});
  }, []);

  const toggleFav = async (id: string) => {
    const next = await fetch(`/api/routines/${id}/favorite`, { method: 'POST' }).then((r) => r.json());
    setRoutines(next);
  };

  const filtered = routines.filter((r) => `${r.code} ${r.name} ${r.category || ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Grid className="w-5 h-5 text-primary" /> Catálogo de Rotinas WinThor
          </h1>
          <p className="text-xs text-muted-foreground">Executáveis, favoritos e verificação rápida de versão.</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar rotina (ex: 2075, 1322)..."
          className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs w-64 focus:outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-mono text-xs font-bold">PC{r.code}</span>
                <h2 className="text-sm font-bold text-foreground mt-1.5">{r.name}</h2>
              </div>
              <button type="button" onClick={() => void toggleFav(r.id)} className="p-1 rounded hover:bg-muted cursor-pointer">
                <Star className={`w-4 h-4 ${r.isFavorite ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
              </button>
            </div>
            <div className="text-2xs font-mono text-muted-foreground truncate">{r.fullPath}</div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-2xs text-muted-foreground">{r.category} • v{r.version}</span>
              <button
                type="button"
                onClick={() => showToast(`Rotina ${r.code} disparada (${r.fullPath}).`, 'success')}
                className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-2xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3" /> Abrir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
