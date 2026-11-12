import React, { useEffect, useState } from 'react';
import { Cpu, Play, Square, RotateCw, Terminal } from 'lucide-react';
import type { GitProjectInfo, KarafBundleInfo, KarafFeatureInfo } from '../../../shared/types';
import { showToast } from '../components/ToastHost';
import { useKarafConsole } from '../hooks/karafConsole/KarafConsoleContext';

export const KarafPage: React.FC<{ projects: GitProjectInfo[] }> = () => {
  const [bundles, setBundles] = useState<KarafBundleInfo[]>([]);
  const [features, setFeatures] = useState<KarafFeatureInfo[]>([]);
  const [search, setSearch] = useState('');
  const { openWithTail } = useKarafConsole();

  const load = async () => {
    const [b, f] = await Promise.all([
      window.electronAPI.listKarafBundles(),
      window.electronAPI.listKarafFeatures()
    ]);
    if (Array.isArray(b)) setBundles(b);
    if (Array.isArray(f)) setFeatures(f);
  };

  useEffect(() => {
    void load();
  }, []);

  const manage = async (id: string, action: 'start' | 'stop' | 'restart') => {
    const res = await window.electronAPI.manageKarafBundle(action, id);
    showToast(res.output, 'info');
    await load();
  };

  const filtered = bundles.filter((b) =>
    `${b.id} ${b.name} ${b.symbolicName || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" /> Apache Karaf &amp; OSGi Bundles
          </h1>
          <p className="text-xs text-muted-foreground">Gerenciamento de bundles, features Maven e console interativo.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar bundles..."
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs w-56 focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => openWithTail()}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" /> Abrir Console
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-muted/40 border-b border-border text-2xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Versão</th>
              <th className="px-3 py-2.5">Bundle / Symbolic Name</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-mono">{b.id}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                    b.state === 'Active' ? 'bg-success/15 text-success' : b.state === 'Waiting' ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'
                  }`}>
                    {b.state}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-2xs">{b.version}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-foreground">{b.name}</div>
                  <div className="text-2xs font-mono text-muted-foreground">{b.symbolicName}</div>
                </td>
                <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                  <button type="button" onClick={() => void manage(b.id, 'start')} className="p-1.5 rounded hover:bg-muted text-success cursor-pointer" title="Start">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => void manage(b.id, 'restart')} className="p-1.5 rounded hover:bg-muted text-primary cursor-pointer" title="Restart">
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => void manage(b.id, 'stop')} className="p-1.5 rounded hover:bg-muted text-danger cursor-pointer" title="Stop">
                    <Square className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-bold text-foreground">Features Instaladas ({features.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {features.map((f) => (
            <div key={f.name} className="p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground">{f.name}</span>
                <span className="text-2xs font-bold text-success">{f.status}</span>
              </div>
              <div className="text-2xs text-muted-foreground mt-0.5">v{f.version} • {f.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
