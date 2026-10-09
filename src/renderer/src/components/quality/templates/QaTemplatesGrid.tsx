import React from 'react';
import { Trash2, Copy, Edit, Download } from 'lucide-react';
import type { QaRegressionTemplate } from '../../../../../shared/types';
import { countAssertions } from '../../../utils/qaTemplatesManagerUtils';

interface QaTemplatesGridProps {
  templates: QaRegressionTemplate[];
  onEdit: (tmpl: QaRegressionTemplate) => void;
  onDuplicate: (tmpl: QaRegressionTemplate) => void;
  onExport: (tmpl: QaRegressionTemplate) => void;
  onDelete: (tmpl: QaRegressionTemplate) => void;
  onSelectTemplate?: (templateId: string) => void;
  onBack: () => void;
}

const ICON_BTN =
  'p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer';

export const QaTemplatesGrid: React.FC<QaTemplatesGridProps> = ({
  templates,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onSelectTemplate,
  onBack
}) => (
  <div className="flex-1 overflow-y-auto p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {templates.map((tmpl) => (
        <div
          key={tmpl.id}
          className="border border-border rounded-md bg-card p-4 flex flex-col justify-between hover:border-primary/50 transition-colors"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="px-1.5 py-0.2 rounded text-2xs font-mono font-medium bg-muted text-muted-foreground border border-border">
                {tmpl.category || 'Geral'}
              </span>
              <span className="text-2xs text-muted-foreground font-mono">
                v{tmpl.version || '1.0.0'}
              </span>
            </div>

            <h3 className="font-semibold text-sm text-foreground mb-1">{tmpl.name}</h3>

            <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
              {tmpl.description || 'Sem descrição.'}
            </p>

            <div className="text-2xs text-muted-foreground font-mono flex items-center gap-2 mb-4">
              <span>
                <b className="text-foreground">{tmpl.steps.length}</b> queries
              </span>
              <span className="text-border">|</span>
              <span>
                <b className="text-foreground">{countAssertions(tmpl)}</b> asserções
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(tmpl)}
                className={ICON_BTN}
                title="Editar template" aria-label="Editar template"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onDuplicate(tmpl)}
                className={ICON_BTN}
                title="Duplicar template" aria-label="Duplicar template"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onExport(tmpl)}
                className={ICON_BTN}
                title="Exportar para arquivo JSON" aria-label="Exportar para arquivo JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onDelete(tmpl)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                title="Excluir template" aria-label="Excluir template"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {onSelectTemplate && (
              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(tmpl.id);
                  onBack();
                }}
                className="px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                Selecionar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);
