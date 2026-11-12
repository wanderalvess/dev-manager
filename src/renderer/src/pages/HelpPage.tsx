import React from 'react';
import { HelpCircle, Keyboard, Layers } from 'lucide-react';
import { NAV_THEME_GROUPS } from '../components/header/headerNavConfig';

export const HelpPage: React.FC<{
  onNavigate: (tab: string) => void;
  initialSearch?: string;
  settingsVersion: number;
  onRestartTour: () => void;
  onResetPageTours: () => void;
}> = ({ onNavigate, onRestartTour }) => (
  <div className="h-full overflow-y-auto p-5 space-y-5 max-w-5xl">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" /> Central de Ajuda &amp; Atalhos
        </h1>
        <p className="text-xs text-muted-foreground">Guia rápido dos módulos, navegação por teclado e diagnósticos.</p>
      </div>
      <button type="button" onClick={onRestartTour} className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer">
        Iniciar Tour Guiado
      </button>
    </div>

    <section className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Keyboard className="w-4 h-4 text-primary" /> Atalhos de Teclado
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        {[
          ['Ctrl + K', 'Abrir Busca Rápida (Quick Launcher)'],
          ['Ctrl + `', 'Abrir / recolher Console Karaf'],
          ['Alt + 1', 'Ambiente Dev'],
          ['Alt + 2', 'Banco de Dados'],
          ['Alt + 3', 'Containers'],
          ['Alt + 4', 'Deploy & Esteiras'],
          ['Alt + 5', 'Git & DevOps'],
          ['Alt + 7', 'Documentação Semântica'],
          ['Alt + 9', 'API Studio']
        ].map(([k, desc]) => (
          <div key={k} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
            <span className="text-muted-foreground">{desc}</span>
            <kbd className="px-2 py-0.5 rounded bg-card border border-border font-mono font-bold text-2xs">{k}</kbd>
          </div>
        ))}
      </div>
    </section>

    <section className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" /> Módulos do Cockpit
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {NAV_THEME_GROUPS.flatMap((g) => g.items).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onNavigate(m.id)}
            className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted text-left transition cursor-pointer"
          >
            <div className="text-xs font-bold text-foreground">{m.label}</div>
            <div className="text-2xs text-muted-foreground mt-0.5">{m.description}</div>
          </button>
        ))}
      </div>
    </section>
  </div>
);
