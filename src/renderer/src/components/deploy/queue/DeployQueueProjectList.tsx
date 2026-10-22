import React from 'react';
import { Search } from 'lucide-react';
import type { DeployQueueProject } from '../../../../../shared/deployQueue';

interface DeployQueueProjectListProps {
  projects: DeployQueueProject[];
  visibleProjects: DeployQueueProject[];
  selected: string[];
  pulledIn: string[];
  search: string;
  onSearchChange: (value: string) => void;
  onToggle: (path: string) => void;
}

/** Lista de projetos Maven do workspace com busca; os arrastados por dependência aparecem marcados e travados. */
export const DeployQueueProjectList: React.FC<DeployQueueProjectListProps> = ({
  projects,
  visibleProjects,
  selected,
  pulledIn,
  search,
  onSearchChange,
  onToggle
}) => (
  <div className="flex flex-col min-h-0 min-w-0">
    <div className="relative mb-2 shrink-0">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={`Buscar entre ${projects.length} projetos...`}
        className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
      />
    </div>
    <ul className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
      {visibleProjects.map((p) => {
        const isPulled = pulledIn.includes(p.path);
        const isChecked = selected.includes(p.path) || isPulled;
        return (
          <li key={p.path}>
            <label
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                isChecked ? 'border-primary/40 bg-primary/5' : 'border-border/60 hover:bg-muted/40'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isPulled}
                onChange={() => onToggle(p.path)}
                className="w-4 h-4 accent-primary shrink-0"
              />
              <span className="font-semibold text-foreground truncate">{p.name}</span>
              <span className="font-mono text-2xs text-muted-foreground truncate">{p.artifactId}</span>
              {p.packaging !== 'jar' && (
                <span className="ml-auto shrink-0 text-2xs font-mono px-1.5 rounded bg-muted text-muted-foreground">
                  {p.packaging}
                </span>
              )}
              {isPulled && (
                <span className="shrink-0 text-2xs font-semibold px-1.5 rounded bg-info/15 text-info" title="Incluído porque um projeto selecionado depende dele">
                  dependência
                </span>
              )}
            </label>
          </li>
        );
      })}
      {visibleProjects.length === 0 && (
        <li className="text-xs text-muted-foreground italic px-2 py-4 text-center">Nenhum projeto encontrado.</li>
      )}
    </ul>
  </div>
);
