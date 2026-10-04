import React, { useState } from 'react';
import { ChevronDown, Copy, Download, Plus, Upload } from 'lucide-react';

interface DeployProfileMenuProps {
  hasActiveProfile: boolean;
  onNew: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onImport: () => void;
}

const itemClass =
  'w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer';

export const DeployProfileMenu: React.FC<DeployProfileMenuProps> = ({
  hasActiveProfile,
  onNew,
  onDuplicate,
  onExport,
  onImport
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const run = (action: () => void) => () => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative" data-tour="profile-menu-options">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-foreground transition-colors flex items-center gap-1 cursor-pointer"
        title="Mais opções de perfil"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-border/50">
            <div className="py-1">
              <button onClick={run(onNew)} className={itemClass}>
                <Plus className="w-3.5 h-3.5 text-primary" /> Novo Perfil
              </button>
              <button onClick={run(onDuplicate)} disabled={!hasActiveProfile} className={`${itemClass} disabled:opacity-40`}>
                <Copy className="w-3.5 h-3.5 text-primary" /> Duplicar Perfil
              </button>
            </div>

            <div className="py-1">
              <button onClick={run(onExport)} disabled={!hasActiveProfile} className={`${itemClass} disabled:opacity-40`}>
                <Download className="w-3.5 h-3.5 text-emerald-500" /> Exportar Perfil (.json)
              </button>
              <button onClick={run(onImport)} className={itemClass}>
                <Upload className="w-3.5 h-3.5 text-indigo-500" /> Importar Perfil (.json)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
