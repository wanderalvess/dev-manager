import React from 'react';
import { AlignLeft, WrapText } from 'lucide-react';

interface SqlEditorStatusBarProps {
  sql: string;
  metrics: { currentLine: number; currentColumn: number; lineCount: number; charCount: number };
  wordWrap: boolean;
  fontSize: number;
  onFormatSql: () => void;
  onToggleWordWrap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const SqlEditorStatusBar: React.FC<SqlEditorStatusBarProps> = ({
  sql,
  metrics,
  wordWrap,
  fontSize,
  onFormatSql,
  onToggleWordWrap,
  onZoomIn,
  onZoomOut
}) => (
  <div className="px-3 py-1 bg-[#090D14] border-b border-border/70 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0 font-sans">
    <div className="flex items-center space-x-3">
      <span className="font-mono text-muted-foreground/80">
        Ln <strong className="text-foreground">{metrics.currentLine}</strong>, Col{' '}
        <strong className="text-foreground">{metrics.currentColumn}</strong>
      </span>
      <span className="text-border">|</span>
      <span>
        {metrics.lineCount} {metrics.lineCount === 1 ? 'linha' : 'linhas'}
      </span>
      <span className="text-border">|</span>
      <span>{metrics.charCount} caracteres</span>
    </div>

    <div className="flex items-center space-x-2">
      {/* Botão Formatar SQL */}
      <button
        type="button"
        onClick={onFormatSql}
        disabled={!sql.trim()}
        className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground transition disabled:opacity-40 cursor-pointer"
        title="Formatar SQL (adicionar quebras e indentação em cláusulas principais)"
      >
        <AlignLeft className="w-3 h-3 text-amber-500" />
        <span>Formatar SQL</span>
      </button>

      <span className="text-border">|</span>

      {/* Toggle Word Wrap */}
      <button
        type="button"
        onClick={onToggleWordWrap}
        className={`flex items-center space-x-1 px-2 py-0.5 rounded transition cursor-pointer ${
          wordWrap
            ? 'bg-primary/20 text-primary font-semibold'
            : 'hover:bg-muted/70 text-muted-foreground hover:text-foreground'
        }`}
        title="Alternar quebra automática de linha"
      >
        <WrapText className="w-3 h-3" />
        <span>Wrap: {wordWrap ? 'ON' : 'OFF'}</span>
      </button>

      <span className="text-border">|</span>

      {/* Zoom da Fonte */}
      <div className="flex items-center space-x-1 font-mono">
        <button
          type="button"
          onClick={onZoomOut}
          className="px-1.5 py-0.5 rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Diminuir fonte do editor"
        >
          A-
        </button>
        <span className="text-2xs text-muted-foreground px-1">{fontSize}px</span>
        <button
          type="button"
          onClick={onZoomIn}
          className="px-1.5 py-0.5 rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Aumentar fonte do editor"
        >
          A+
        </button>
      </div>
    </div>
  </div>
);
