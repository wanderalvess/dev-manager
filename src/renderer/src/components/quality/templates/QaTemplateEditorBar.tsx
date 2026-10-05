import React from 'react';
import { Download, Save } from 'lucide-react';
import type { QaRegressionTemplate } from '../../../../../shared/types';

interface QaTemplateEditorBarProps {
  template: QaRegressionTemplate;
  onChange: (template: QaRegressionTemplate) => void;
  onExport: (template: QaRegressionTemplate) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const QaTemplateEditorBar: React.FC<QaTemplateEditorBarProps> = ({
  template,
  onChange,
  onExport,
  onCancel,
  onSave
}) => (
  <div className="px-4 py-2.5 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0">
    <div className="flex items-center gap-2.5 flex-1">
      <input
        type="text"
        value={template.name}
        onChange={(e) => onChange({ ...template, name: e.target.value })}
        placeholder="Nome do Cenário"
        className="bg-background border border-border rounded-md px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-72"
      />
      <input
        type="text"
        value={template.category || ''}
        onChange={(e) => onChange({ ...template, category: e.target.value })}
        placeholder="Categoria (ex: Vendas PDV)"
        className="bg-background border border-border rounded-md px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
      />
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onExport(template)}
        className="px-3 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
        title="Exportar este template para arquivo JSON"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Exportar JSON</span>
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer transition-colors"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
      >
        <Save className="w-3.5 h-3.5" />
        <span>Salvar Template</span>
      </button>
    </div>
  </div>
);
