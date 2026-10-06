import React, { useEffect } from 'react';
import type { ValidationCategory } from '../../../utils/qualityPageUtils';

interface QualityAddItemModalProps {
  title: string;
  onTitleChange: (value: string) => void;
  target: string;
  onTargetChange: (value: string) => void;
  category: ValidationCategory;
  onCategoryChange: (value: ValidationCategory) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isEditing?: boolean;
}

export const QualityAddItemModal: React.FC<QualityAddItemModalProps> = ({
  title,
  onTitleChange,
  target,
  onTargetChange,
  category,
  onCategoryChange,
  notes,
  onNotesChange,
  onSubmit,
  onClose,
  isEditing = false
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Editar Cenário de Teste' : 'Novo Cenário de Teste'}
      className="bg-card w-full max-w-md rounded-lg border border-border shadow-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{isEditing ? 'Editar Cenário de Teste' : 'Novo Cenário de Teste'}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-muted-foreground hover:text-foreground cursor-pointer font-mono"
        >
          ✕
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Título do Cenário</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Ex: Validar emissão de nota com desconto..."
            className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Alvo / Componente</label>
          <input
            type="text"
            required
            value={target}
            onChange={(e) => onTargetChange(e.target.value)}
            placeholder="Ex: Rotina 1402, Karaf, API de Pagamento..."
            className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as ValidationCategory)}
            className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="routine">Rotina Delphi</option>
            <option value="service">Serviço / Karaf</option>
            <option value="api">API REST</option>
            <option value="e2e">Fluxo E2E</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Notas / Critérios de Aceite (Opcional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Descreva os passos essenciais ou o resultado esperado..."
            className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground text-xs font-medium cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:bg-primary/90 transition-colors"
          >
            {isEditing ? 'Salvar Alterações' : 'Adicionar Cenário'}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};
