import React from 'react';
import { FolderOpen, Plus, ArrowLeft, Layers, Upload, Download, HelpCircle } from 'lucide-react';

interface QaTemplatesManagerHeaderProps {
  templatesDir: string;
  showExportAll: boolean;
  onBack: () => void;
  onExportAll: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreate: () => void;
  onOpenHelp: () => void;
}

export const QaTemplatesManagerHeader: React.FC<QaTemplatesManagerHeaderProps> = ({
  templatesDir,
  showExportAll,
  onBack,
  onExportAll,
  onImport,
  onCreate,
  onOpenHelp
}) => (
  <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between gap-4 shrink-0">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="p-1.5 rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
        title="Voltar para a Execução de Testes"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span>Gerenciador de Cenários &amp; Templates de Regressivo</span>
        </h2>
        {templatesDir && (
          <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Pasta dedicada: {templatesDir}</span>
          </p>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2">
      {showExportAll && (
        <button
          type="button"
          onClick={onExportAll}
          className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Exportar todos os templates em lote (arquivo JSON único para backup)"
        >
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Exportar Todos</span>
        </button>
      )}

      <label className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
        <Upload className="w-3.5 h-3.5 text-muted-foreground" />
        <span>Importar JSON</span>
        <input type="file" accept=".json" onChange={onImport} className="hidden" />
      </label>

      <button
        type="button"
        onClick={onCreate}
        className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Novo Template</span>
      </button>

      <button
        type="button"
        onClick={onOpenHelp}
        className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        title="Guia Prático: Como usar, configurar asserções e exportar templates"
      >
        <HelpCircle className="w-3.5 h-3.5 text-primary" />
        <span>Como Usar</span>
      </button>
    </div>
  </div>
);
