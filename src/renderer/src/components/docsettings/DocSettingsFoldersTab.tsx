import React from 'react';
import { GitBranch, RotateCcw } from 'lucide-react';
import type { DocFolderConfig, DocsIndexStatus } from '../../../../shared/types';
import { DocSettingsEmbeddingCard } from './DocSettingsEmbeddingCard';
import { DocSettingsToggleCard } from './DocSettingsToggleCard';
import { DocSettingsFolderList } from './DocSettingsFolderList';

interface DocSettingsFoldersTabProps {
  status?: DocsIndexStatus | null;
  onOpenModelHelp?: () => void;
  docFolders: DocFolderConfig[];
  indexProjectsDocs: boolean;
  autoReindexOnChange: boolean;
  isAddingFolder: boolean;
  copiedFolderPath: string | null;
  onToggleIndexProjects: (checked: boolean) => Promise<void>;
  onToggleAutoReindex: (checked: boolean) => Promise<void>;
  onAddFolder: () => Promise<void>;
  onRemoveFolder: (path: string) => Promise<void>;
  onCopyPath: (path: string) => void;
  onOpenInExplorer: (path: string) => void;
}

export const DocSettingsFoldersTab: React.FC<DocSettingsFoldersTabProps> = ({
  status,
  onOpenModelHelp,
  indexProjectsDocs,
  autoReindexOnChange,
  onToggleIndexProjects,
  onToggleAutoReindex,
  ...listProps
}) => (
  <div className="space-y-4">
    <DocSettingsEmbeddingCard status={status} onOpenModelHelp={onOpenModelHelp} />

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <DocSettingsToggleCard
        icon={<GitBranch className="w-3.5 h-3.5" />}
        iconWrapperClass="bg-amber-500/10 text-amber-500 border border-amber-500/20"
        title="Repositórios Git"
        description="Vasculha arquivos README e pastas docs/ em todos os projetos Git clonados no Hub Manager."
        checked={indexProjectsDocs}
        onToggle={onToggleIndexProjects}
        activeLabel="Indexação Ativa"
        inactiveLabel="Desativado (clique para ativar)"
      />
      <DocSettingsToggleCard
        icon={<RotateCcw className="w-3.5 h-3.5" />}
        iconWrapperClass="bg-primary/10 text-primary border border-primary/20"
        title="Watchdog Automático"
        description="Monitora o sistema de arquivos e reindexa trechos semanticamente em segundo plano ao salvar."
        checked={autoReindexOnChange}
        onToggle={onToggleAutoReindex}
        activeLabel="Watchdog Ativo"
        inactiveLabel="Apenas Manual (clique para ativar)"
      />
    </div>

    <DocSettingsFolderList {...listProps} />
  </div>
);
