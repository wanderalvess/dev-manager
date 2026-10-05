import React from 'react';
import { Sparkles } from 'lucide-react';
import { QualitySourceTemplate, DEFAULT_QUALITY_SOURCE_TEMPLATES } from '../../../../../shared/types';

interface QualityTemplateGridProps {
  onApplyTemplate: (template: QualitySourceTemplate) => void;
}

export const QualityTemplateGrid: React.FC<QualityTemplateGridProps> = ({ onApplyTemplate }) => (
  <div className="space-y-2">
    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
      Conexões Pré-Configuradas &amp; Templates Rápidos:
    </span>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {DEFAULT_QUALITY_SOURCE_TEMPLATES.map((tmpl) => (
        <button
          key={tmpl.name}
          type="button"
          onClick={() => onApplyTemplate(tmpl)}
          className="p-3 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/70 hover:border-primary/40 text-left transition space-y-1.5 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              {tmpl.name}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-primary opacity-60 group-hover:opacity-100" />
          </div>
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{tmpl.description}</p>
        </button>
      ))}
    </div>
  </div>
);
