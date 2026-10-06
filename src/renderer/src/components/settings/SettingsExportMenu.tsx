import React from 'react';
import { ChevronDown, Download, ShieldCheck } from 'lucide-react';

interface SettingsExportMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onExport: (sanitizePasswords: boolean) => void;
}

const ITEM_CLASS = 'w-full px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-2.5 transition-colors hover:bg-muted text-left';

/** Botão "Exportar" com o menu de exportação segura (sem senhas) ou completa (backup deste PC). */
export const SettingsExportMenu: React.FC<SettingsExportMenuProps> = ({ isOpen, onToggle, onClose, onExport }) => (
  <div className="relative">
    <button
      type="button"
      onClick={onToggle}
      className="px-3 py-2 bg-card hover:bg-muted text-foreground border border-border hover:border-border rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
      title="Exportar configurações para compartilhar com o time ou criar backup"
      aria-haspopup="menu"
      aria-expanded={isOpen}
    >
      <Download className="w-3.5 h-3.5 text-muted-foreground" />
      <span>Exportar</span>
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </button>

    {isOpen && (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div role="menu" className="absolute right-0 mt-2 w-72 origin-top-right rounded-lg bg-card border border-border shadow-xl p-1.5 z-50 flex flex-col space-y-1">
          <button type="button" role="menuitem" onClick={() => onExport(true)} className={ITEM_CLASS}>
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-bold text-foreground">Exportação Segura (JSON)</div>
              <div className="text-2xs text-muted-foreground">Omite senhas do banco e Karaf (P/ Time)</div>
            </div>
          </button>
          <button type="button" role="menuitem" onClick={() => onExport(false)} className={ITEM_CLASS}>
            <Download className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <div className="font-bold text-foreground">Exportação Completa (Backup)</div>
              <div className="text-2xs text-muted-foreground">Contém todas as senhas (Para este PC)</div>
            </div>
          </button>
        </div>
      </>
    )}
  </div>
);
