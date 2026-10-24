import React from 'react';
import { Activity, Boxes, Download, ListTree, type LucideIcon } from 'lucide-react';

export type KarafTool = 'bundles' | 'features' | 'catalog801' | 'jvm';

interface ToolDef {
  id: KarafTool;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const TOOLS: ToolDef[] = [
  {
    id: 'bundles',
    title: 'Bundles OSGi',
    description: 'Lista, instala, atualiza, reinicia e desinstala bundles, com análise de dependências e fiação.',
    icon: ListTree,
    accent: 'text-primary'
  },
  {
    id: 'features',
    title: 'Features & Repositórios',
    description: 'Gerencia features Maven/Karaf e repositórios (feature:repo-list), com instalação e log.',
    icon: Boxes,
    accent: 'text-info'
  },
  {
    id: 'catalog801',
    title: 'Catálogo 801',
    description: 'Catálogo oficial de serviços e rotinas (Rotina 801 – Atualização de Serviços Web).',
    icon: Download,
    accent: 'text-success'
  },
  {
    id: 'jvm',
    title: 'Memória JVM',
    description: 'Monitor de Heap, Non-Heap e GC em tempo real (JMX), com coleta de lixo sob demanda.',
    icon: Activity,
    accent: 'text-warning'
  }
];

interface KarafToolCardsProps {
  onOpen: (tool: KarafTool) => void;
}

/** Atalhos grandes para as ferramentas de gestão do Karaf (cada uma abre seu painel). */
export const KarafToolCards: React.FC<KarafToolCardsProps> = ({ onOpen }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" data-tour="karaf-tools">
    {TOOLS.map(({ id, title, description, icon: Icon, accent }) => (
      <button
        key={id}
        type="button"
        onClick={() => onOpen(id)}
        className="rounded-[14px] bg-card p-4 border border-border shadow-xs text-left flex flex-col gap-1.5 hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Icon className={`w-4 h-4 ${accent}`} />
          {title}
        </span>
        <span className="text-[13px] text-muted-foreground leading-relaxed">{description}</span>
      </button>
    ))}
  </div>
);
