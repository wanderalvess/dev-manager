import React, { useState } from 'react';
import { Square, RefreshCw, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface ProfileActionsMenuProps {
  isRunningProfile: boolean;
  isStoppingAll: boolean;
  onStopAll: () => void;
  onRestartAll: () => void;
}

/** Menu de ações do perfil: Parar Tudo / Reiniciar Tudo. */
export const ProfileActionsMenu: React.FC<ProfileActionsMenuProps> = ({
  isRunningProfile,
  isStoppingAll,
  onStopAll,
  onRestartAll
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isRunningProfile}
        className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-card hover:bg-muted text-foreground border border-border shadow-sm"
        title="Ações do perfil: parar ou reiniciar toda a esteira"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        <span>Ações</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl bg-card border border-border shadow-2xl p-1.5 z-50 flex flex-col space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onStopAll();
              }}
              disabled={isStoppingAll || isRunningProfile}
              className="w-full px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-left"
              title="Encerrar todos os processos e portas configuradas neste perfil"
            >
              <Square className="w-3.5 h-3.5 shrink-0" />
              <span>Parar Tudo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onRestartAll();
              }}
              disabled={isRunningProfile}
              className="w-full px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-left"
              title="Derrubar todas as portas e reexecutar a esteira na sequência"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Reiniciar Tudo</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
