import React, { useState, useMemo } from 'react';
import { Copy, Check, WrapText, FileCode2, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { showToast } from '../ToastHost';
import { formatCellForCopy } from '../../utils/databaseCsvUtils';

export interface CellViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnName: string;
  rowIndex: number;
  value: any;
  dataType?: string;
  onCopyCell?: (val: any, key?: string, colName?: string) => void;
}

export const CellViewerModal: React.FC<CellViewerModalProps> = ({
  isOpen,
  onClose,
  columnName,
  rowIndex,
  value,
  dataType = 'string',
  onCopyCell
}) => {
  const [wordWrap, setWordWrap] = useState(true);
  const [isPrettyJson, setIsPrettyJson] = useState(true);
  const [copied, setCopied] = useState(false);

  const rawString = useMemo(() => formatCellForCopy(value), [value]);

  const { isJson, formattedContent } = useMemo(() => {
    if (value === null || value === undefined) {
      return { isJson: false, formattedContent: '[NULL]' };
    }
    if (typeof value === 'object') {
      return { isJson: true, formattedContent: JSON.stringify(value, null, 2) };
    }
    if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(value);
        return { isJson: true, formattedContent: JSON.stringify(parsed, null, 2) };
      } catch {
        // Not valid JSON
      }
    }
    return { isJson: false, formattedContent: rawString };
  }, [value, rawString]);

  if (!isOpen) return null;

  const displayContent = isJson && isPrettyJson ? formattedContent : rawString;

  const handleCopy = () => {
    if (onCopyCell) {
      onCopyCell(displayContent, `viewer_${columnName}_${rowIndex}`, columnName);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-lg w-full max-w-3xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
        <div className="flex items-center space-x-2">
          <FileCode2 className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Coluna: <span className="font-mono text-primary">{columnName}</span>
          </h3>
          <span className="text-2xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-mono">
            Linha #{rowIndex + 1}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
            {dataType}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-md hover:bg-muted/60 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center justify-between text-2xs">
        <div className="flex items-center space-x-2">
          {isJson && (
            <button
              type="button"
              onClick={() => setIsPrettyJson(!isPrettyJson)}
              className={`px-2 py-1 rounded font-semibold transition cursor-pointer border ${
                isPrettyJson
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-muted border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {isPrettyJson ? 'JSON Formatado' : 'Texto Original'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setWordWrap(!wordWrap)}
            className={`flex items-center space-x-1 px-2 py-1 rounded font-semibold transition cursor-pointer border ${
              wordWrap
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <WrapText className="w-3 h-3" />
            <span>Quebra de linha</span>
          </button>
        </div>

        <div className="text-muted-foreground font-mono">
          {displayContent.length.toLocaleString('pt-BR')} caracteres
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 overflow-auto bg-background">
        <pre
          className={`font-mono text-xs text-foreground p-3 rounded-lg bg-card border border-border/60 select-text ${
            wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
          }`}
        >
          {displayContent}
        </pre>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/60 bg-muted/40 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          className="px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition shadow-xs flex items-center space-x-1.5 cursor-pointer text-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado!' : 'Copiar Conteúdo'}</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-muted-foreground hover:text-foreground font-semibold cursor-pointer text-xs"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
};
