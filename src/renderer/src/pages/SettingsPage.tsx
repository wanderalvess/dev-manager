import React, { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import type { AppSettings } from '../../../shared/types';
import { NAV_THEME_GROUPS } from '../components/header/headerNavConfig';
import { showToast } from '../components/ToastHost';

export const SettingsPage: React.FC<{ onSettingsSaved: () => void; onNavigate: (tab: string) => void }> = ({
  onSettingsSaved
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings).catch(() => {});
  }, []);

  if (!settings) return null;

  const toggleModule = (id: string) => {
    const disabled = new Set(settings.disabledModules || []);
    if (disabled.has(id)) disabled.delete(id);
    else disabled.add(id);
    setSettings({ ...settings, disabledModules: Array.from(disabled) });
  };

  const save = async () => {
    await window.electronAPI.saveSettings(settings);
    onSettingsSaved();
    showToast('Configurações salvas com sucesso!', 'success');
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> Configurações do Hub Manager
          </h1>
          <p className="text-xs text-muted-foreground">Módulos visíveis, diretórios e parâmetros do Apache Karaf.</p>
        </div>
        <button type="button" onClick={() => void save()} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          <Save className="w-3.5 h-3.5" /> Salvar
        </button>
      </div>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-foreground">Diretórios &amp; Karaf SSH</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1">
            <span className="text-muted-foreground font-semibold">Pasta de Projetos</span>
            <input
              value={settings.projectsDir}
              onChange={(e) => setSettings({ ...settings, projectsDir: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground font-semibold">Pasta do Karaf</span>
            <input
              value={settings.karafDir}
              onChange={(e) => setSettings({ ...settings, karafDir: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground font-semibold">Host Karaf SSH</span>
            <input
              value={settings.karafSshHost}
              onChange={(e) => setSettings({ ...settings, karafSshHost: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground font-semibold">Porta Karaf SSH</span>
            <input
              type="number"
              value={settings.karafSshPort}
              onChange={(e) => setSettings({ ...settings, karafSshPort: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono"
            />
          </label>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-foreground">Módulos Visíveis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {NAV_THEME_GROUPS.flatMap((g) => g.items).map((item) => {
            const enabled = !(settings.disabledModules || []).includes(item.id);
            return (
              <label key={item.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20 text-xs cursor-pointer">
                <input type="checkbox" checked={enabled} onChange={() => toggleModule(item.id)} />
                <span className="font-semibold text-foreground truncate">{item.label}</span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
};
