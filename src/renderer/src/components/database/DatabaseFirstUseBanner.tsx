import React from 'react';
import { AlertTriangle, Settings, DatabaseZap } from 'lucide-react';

interface DatabaseFirstUseBannerProps {
  onOpenCreateModal: () => void;
  onNavigateToSettings?: () => void;
}

/** Aviso de primeiro uso: nenhuma conexão de banco cadastrada ainda. */
export const DatabaseFirstUseBanner: React.FC<DatabaseFirstUseBannerProps> = ({
  onOpenCreateModal,
  onNavigateToSettings
}) => (
  <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/40 p-3 flex items-start space-x-2.5 text-xs text-amber-700 dark:text-amber-200">
    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
    <div className="flex-1">
      <span className="font-bold block">Nenhuma conexão de banco configurada</span>
      <span className="text-2xs text-muted-foreground block mt-0.5">
        Cadastre uma conexão Oracle, PostgreSQL ou MySQL para executar consultas, ver tabelas e agendar
        backups.
      </span>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onOpenCreateModal}
        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-2xs font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1 transition-all"
      >
        <DatabaseZap className="w-3 h-3" />
        <span>Nova Conexão</span>
      </button>
      {onNavigateToSettings && (
        <button
          type="button"
          onClick={onNavigateToSettings}
          className="px-2.5 py-1 bg-card hover:bg-muted border border-amber-500/40 rounded-lg text-2xs font-bold text-amber-700 dark:text-amber-200 flex items-center gap-1 transition-all"
        >
          <Settings className="w-3 h-3" />
          <span>Configurações</span>
        </button>
      )}
    </div>
  </div>
);
