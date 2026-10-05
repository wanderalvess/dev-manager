import React from 'react';
import { Code2 } from 'lucide-react';

const BADGE_BASE = 'px-2.5 py-1 rounded-lg bg-card border border-border font-semibold';

// Cada item mantém a cor original do chip; as strings são conteúdo do produto.
const STACK_ITEMS: { label: string; colorClass: string }[] = [
  { label: 'Electron 29', colorClass: 'text-foreground' },
  { label: 'React 18 + TypeScript 5', colorClass: 'text-cyan-400' },
  { label: 'Tailwind CSS 3', colorClass: 'text-blue-400' },
  { label: 'Vite 5', colorClass: 'text-amber-400' },
  { label: 'Lucide Icons', colorClass: 'text-primary' },
  { label: 'Apache Karaf OSGi', colorClass: 'text-purple-400' },
  { label: 'Git & Azure DevOps REST', colorClass: 'text-emerald-400' },
  { label: 'Model Context Protocol (MCP)', colorClass: 'text-violet-400' }
];

/** Tecnologias utilizadas */
export const HelpAboutStackPanel: React.FC = () => (
  <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3 shadow-md">
    <div className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
      <Code2 className="w-4 h-4 text-primary" />
      <span>Stack Tecnológica do Painel</span>
    </div>
    <div className="flex flex-wrap gap-2 text-xs font-mono">
      {STACK_ITEMS.map((item) => (
        <span key={item.label} className={`${BADGE_BASE} ${item.colorClass}`}>
          {item.label}
        </span>
      ))}
    </div>
  </div>
);
