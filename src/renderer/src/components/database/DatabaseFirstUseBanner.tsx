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
  <div className="shrink-0 bg-warning/10 px-7 py-3.5 flex items-start space-x-3 text-[13px] text-foreground">
    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
    <div className="flex-1">
      <span className="font-semibold block">Nenhuma conexão de banco configurada</span>
      <span className="text-[13px] text-muted-foreground block mt-0.5">
        Cadastre uma conexão Oracle, PostgreSQL ou MySQL para executar consultas, ver tabelas e agendar
        backups.
      </span>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onOpenCreateModal}
        className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <DatabaseZap className="w-3.5 h-3.5" />
        <span>Nova conexão</span>
      </button>
      {onNavigateToSettings && (
        <button
          type="button"
          onClick={onNavigateToSettings}
          className="h-8 px-3 bg-card hover:bg-muted border border-border rounded-lg text-[13px] font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurações</span>
        </button>
      )}
    </div>
  </div>
);
