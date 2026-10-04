import React from 'react';
import { FolderOpen, Settings } from 'lucide-react';

interface DocsEmptyIndexProps {
  hasFolders: boolean;
  onNavigateToSettings?: () => void;
}

export const DocsEmptyIndex: React.FC<DocsEmptyIndexProps> = ({ hasFolders, onNavigateToSettings }) => (
  <div className="cockpit-panel rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3 border border-border">
    <FolderOpen className="w-10 h-10 text-primary/50" />
    <div>
      <h4 className="text-sm font-bold text-foreground">Nenhum índice de documentação gerado ainda</h4>
      <p className="text-xs text-muted-foreground mt-1 max-w-md">
        {hasFolders
          ? 'Suas pastas de projetos e documentação já estão configuradas. Clique em "Indexar Documentação" acima para processar os arquivos e habilitar a busca.'
          : 'Clique em "Indexar Documentação" pra escanear os projetos configurados em busca de README e arquivos de doc.'}
      </p>
    </div>
    {!hasFolders && onNavigateToSettings && (
      <button
        type="button"
        onClick={onNavigateToSettings}
        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-primary/20 cursor-pointer active:scale-95"
      >
        <Settings className="w-3.5 h-3.5" />
        <span>Configurar Pasta de Projetos</span>
      </button>
    )}
  </div>
);
