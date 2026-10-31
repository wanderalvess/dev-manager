import React from 'react';
import { CheckCircle2, Save } from 'lucide-react';

interface SettingsSaveBarProps {
  changedCount: number;
  isSaving: boolean;
  savedSuccess: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/**
 * Barra fixa no pé da seção: só aparece com alteração pendente (ou logo após salvar). É o único lugar onde se salva;
 * o que grava direto no disco leva a etiqueta "aplica na hora" na própria seção.
 */
export const SettingsSaveBar: React.FC<SettingsSaveBarProps> = ({ changedCount, isSaving, savedSuccess, onDiscard, onSave }) => {
  if (changedCount === 0 && !isSaving && !savedSuccess) return null;

  if (savedSuccess && changedCount === 0) {
    return (
      <div role="status" className="sticky bottom-3 z-20 flex items-center gap-2 rounded-xl border border-success/30 bg-card px-4 py-3 text-xs font-semibold text-success shadow-lg">
        <CheckCircle2 className="w-4 h-4" /> Alterações salvas.
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Alterações pendentes"
      className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-card px-4 py-2.5 shadow-lg"
    >
      <span aria-hidden="true" className="w-2 h-2 rounded-full bg-warning shrink-0" />
      <span className="flex-1 min-w-48 text-xs text-foreground">
        <strong>
          {changedCount === 1 ? '1 alteração não salva' : `${changedCount} alterações não salvas`}
        </strong>
        <span className="text-muted-foreground"> · vale para todas as seções</span>
      </span>
      <button
        type="button"
        onClick={onDiscard}
        disabled={isSaving}
        className="h-9 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
      >
        Descartar
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        aria-busy={isSaving}
        className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Salvando…' : 'Salvar alterações'}
      </button>
    </div>
  );
};
