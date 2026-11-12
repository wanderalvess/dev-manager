import React from 'react';
import { Plug, CheckCircle2 } from 'lucide-react';
import type { GitProjectInfo } from '../../../shared/types';

export const IntegrationsPage: React.FC<{
  projects: GitProjectInfo[];
  settingsVersion: number;
  onNavigate: (tab: string) => void;
  onNavigateToHelp: (search?: string) => void;
}> = () => (
  <div className="h-full overflow-y-auto p-5 space-y-4">
    <div>
      <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
        <Plug className="w-5 h-5 text-primary" /> Integrações &amp; Conectores
      </h1>
      <p className="text-xs text-muted-foreground">Conectores Jira, Confluence, Azure DevOps e MCP Server.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[
        { name: 'Servidor MCP Embutido', status: 'Disponível', desc: 'Exposição das ferramentas do Hub Manager para assistentes de IA' },
        { name: 'Azure DevOps & Git', status: 'Ativo', desc: 'Consulta de PRs, branches e histórico local' },
        { name: 'Confluence & Jira', status: 'Configurável', desc: 'Sincronização de base documental e tarefas do dia' }
      ].map((item) => (
        <div key={item.name} className="bg-card border border-border rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{item.name}</span>
            <span className="text-2xs font-bold text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {item.status}</span>
          </div>
          <p className="text-xs text-muted-foreground">{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
);
