import React from 'react';
import type { AutocompleteState } from '../../../utils/sqlEditorUtils';

interface SqlEditorSurfaceProps {
  sql: string;
  isMaximizedActual: boolean;
  editorHeight: number;
  fontSize: number;
  wordWrap: boolean;
  linesArray: number[];
  currentLine: number;
  autocomplete: AutocompleteState | null;
  copyFeedback: string | null;
  sqlTextareaRef: React.RefObject<HTMLTextAreaElement>;
  lineNumbersRef: React.RefObject<HTMLDivElement>;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onCursorChange: (caret: number) => void;
  onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  onClickCompute: (caret: number) => void;
  onBlur: () => void;
  onApplySuggestion: (label: string) => void;
}

export const SqlEditorSurface: React.FC<SqlEditorSurfaceProps> = ({
  sql,
  isMaximizedActual,
  editorHeight,
  fontSize,
  wordWrap,
  linesArray,
  currentLine,
  autocomplete,
  copyFeedback,
  sqlTextareaRef,
  lineNumbersRef,
  onChange,
  onKeyDown,
  onCursorChange,
  onScroll,
  onClickCompute,
  onBlur,
  onApplySuggestion
}) => (
  <div
    className={`border-b border-border/70 relative flex overflow-hidden shrink-0 ${
      isMaximizedActual ? 'flex-1 h-full min-h-[350px]' : ''
    }`}
    style={!isMaximizedActual ? { height: `${editorHeight}px` } : undefined}
    data-tour="sql-editor"
  >
    {/* Coluna de Números de Linha */}
    <div
      ref={lineNumbersRef}
      className="select-none overflow-hidden py-3 pl-2.5 pr-2 bg-[#080B11] border-r border-border/40 text-muted-foreground/40 font-mono text-right shrink-0"
      style={{ fontSize: `${fontSize}px`, width: '44px', lineHeight: '1.5rem' }}
      aria-hidden="true"
    >
      {linesArray.map((lineNum) => {
        const isCurrentLine = lineNum === currentLine;
        return (
          <div
            key={lineNum}
            className={`transition-colors ${
              isCurrentLine ? 'text-primary font-bold bg-primary/15 rounded-xs' : ''
            }`}
            style={{ height: '1.5rem' }}
          >
            {lineNum}
          </div>
        );
      })}
    </div>

    {/* Textarea de Código */}
    <div className="flex-1 relative h-full overflow-hidden bg-[#0B0F17]">
      <textarea
        ref={sqlTextareaRef}
        value={sql}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => onCursorChange(e.currentTarget.selectionStart)}
        onSelect={(e) => onCursorChange(e.currentTarget.selectionStart)}
        onScroll={onScroll}
        onClick={(e) => {
          onCursorChange(e.currentTarget.selectionStart);
          onClickCompute(e.currentTarget.selectionStart);
        }}
        onBlur={onBlur}
        placeholder="Digite aqui seu comando SQL (SELECT, UPDATE, INSERT, DELETE, etc.)..."
        className={`w-full h-full p-3 bg-transparent text-emerald-300 font-mono resize-none focus:outline-none [scrollbar-width:thin] ${
          wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
        }`}
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.5rem' }}
        spellCheck={false}
      />
      {autocomplete && (
        <div className="absolute left-3 bottom-1 translate-y-full z-20 w-64 max-h-48 overflow-y-auto bg-[#131926] border border-border/70 rounded shadow-lg text-xs">
          {autocomplete.suggestions.map((s, idx) => (
            <button
              key={`${s.type}-${s.label}-${idx}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onApplySuggestion(s.label);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left font-mono cursor-pointer ${
                idx === autocomplete.activeIndex ? 'bg-primary/20 text-primary' : 'text-emerald-200 hover:bg-white/5'
              }`}
            >
              <span className="truncate">{s.label}</span>
              <span className="text-2xs uppercase tracking-wide opacity-50 ml-2 shrink-0">
                {s.type === 'keyword' ? 'kw' : s.type === 'table' ? 'tab' : 'col'}
              </span>
            </button>
          ))}
        </div>
      )}
      {copyFeedback && (
        <div className="absolute right-3 bottom-3 bg-primary text-primary-foreground text-2xs font-bold px-2 py-1 rounded shadow-md animate-fade-in">
          {copyFeedback}
        </div>
      )}
    </div>
  </div>
);
