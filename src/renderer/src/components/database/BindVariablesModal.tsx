import React from 'react';
import { SlidersHorizontal, X, FileCode, Play } from 'lucide-react';
import { BindInputState } from '../../utils/sqlBinds';

export interface BindVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bindInputs: BindInputState[];
  setBindInputs: React.Dispatch<React.SetStateAction<BindInputState[]>>;
  onConfirmExecute: (e?: React.FormEvent) => void;
  onSubstituteInline: () => void;
}

export const BindVariablesModal: React.FC<BindVariablesModalProps> = ({
  isOpen,
  onClose,
  bindInputs,
  setBindInputs,
  onConfirmExecute,
  onSubstituteInline
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm">Parâmetros da Consulta (Bind Variables)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-400">
                  {bindInputs.length} {bindInputs.length === 1 ? 'parâmetro' : 'parâmetros'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Informe os valores para as variáveis identificadas no comando SQL.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onConfirmExecute} className="space-y-4">
          <div className="max-h-72 overflow-y-auto pr-1 space-y-2.5 [scrollbar-width:thin]">
            {bindInputs.map((item, idx) => (
              <div
                key={item.name}
                className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
              >
                <div className="flex items-center space-x-2 min-w-36">
                  <span className="font-mono font-bold text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded">
                    :{item.name}
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-1 w-full sm:w-auto">
                  {/* Seletor de Tipo */}
                  <select
                    value={item.type}
                    onChange={(e) => {
                      const newType = e.target.value as BindInputState['type'];
                      setBindInputs((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, type: newType } : p))
                      );
                    }}
                    className="bg-card border border-border text-foreground text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                    title="Tipo de Dado"
                  >
                    <option value="auto">Auto</option>
                    <option value="string">Texto</option>
                    <option value="number">Número</option>
                    <option value="date">Data</option>
                    <option value="null">Nulo (NULL)</option>
                  </select>

                  {/* Campo de Valor */}
                  {item.type === 'null' ? (
                    <input
                      type="text"
                      disabled
                      value="NULL"
                      className="flex-1 bg-muted/40 border border-border/60 rounded px-2.5 py-1.5 text-xs text-muted-foreground font-mono cursor-not-allowed italic"
                    />
                  ) : (
                    <input
                      type={item.type === 'date' ? 'date' : 'text'}
                      autoFocus={idx === 0}
                      placeholder={`Valor para :${item.name}...`}
                      value={item.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBindInputs((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, value: val } : p))
                        );
                      }}
                      className="flex-1 bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onSubstituteInline}
              className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/50 hover:bg-muted text-xs font-medium text-foreground transition flex items-center gap-1.5 cursor-pointer"
              title="Substitui as variáveis :PARAMETRO diretamente no editor de código pelos literais informados"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-500" />
              <span>Substituir no SQL (Inline)</span>
            </button>

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Executar Consulta</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
