import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { EXPORT_FORMATS, type ExportFormat } from '../../utils/databaseExportUtils';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
}

/** Menu "Exportar": Excel, CSV para Excel (Brasil), CSV padrão e JSON, sobre as linhas exibidas. */
export const ExportMenu: React.FC<ExportMenuProps> = ({ onExport }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Exportar as linhas exibidas (respeita busca, filtros e ordenação)"
        className="flex items-center space-x-1 text-primary hover:underline font-medium text-[11px] cursor-pointer"
      >
        <Download className="w-3 h-3" />
        <span>Exportar</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-64 rounded-lg border border-border bg-card shadow-xl py-1"
        >
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onExport(f.id);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-muted cursor-pointer"
            >
              <span className="block text-xs font-semibold text-foreground">{f.label}</span>
              <span className="block text-2xs text-muted-foreground">{f.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
