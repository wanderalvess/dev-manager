import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  FileCode,
  Play,
  Plus,
  Trash2,
  RotateCcw,
  HelpCircle
} from 'lucide-react';
import { BindInputState, SqlVariablePrefix } from '../../utils/sqlBinds';

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
  const [newVarName, setNewVarName] = useState<string>('');
  const [newVarPrefix, setNewVarPrefix] = useState<SqlVariablePrefix>(':');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAddNewVariable = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newVarName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if (!cleanName) return;

    if (!bindInputs.some((b) => b.name === cleanName)) {
      setBindInputs((prev) => [
        ...prev,
        {
          name: cleanName,
          value: '',
          type: 'auto',
          prefix: newVarPrefix,
          raw: `${newVarPrefix}${cleanName}`
        }
      ]);
    }

    setNewVarName('');
    setShowAddForm(false);
  };

  const handleRemoveVariable = (idx: number) => {
    setBindInputs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearAllValues = () => {
    setBindInputs((prev) => prev.map((item) => ({ ...item, value: '' })));
  };

  const getPrefixBadge = (prefix?: SqlVariablePrefix) => {
    switch (prefix) {
      case '&':
      case '&&':
        return (
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
            title="Variável de substituição do SQL*Plus / PL/SQL / WinThor (&VAR)"
          >
            {prefix} SQL*Plus
          </span>
        );
      case '@':
        return (
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30"
            title="Variável de script / sessão (@VAR)"
          >
            @ Script
          </span>
        );
      case '${}':
      case '#{}':
        return (
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30"
            title="Placeholder de template / MyBatis (${VAR})"
          >
            {prefix} Template
          </span>
        );
      default:
        return (
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30"
            title="Bind Variable nativa (:VAR)"
          >
            : Bind
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 font-sans">
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm">Parâmetros e Variáveis da Consulta</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-400">
                  {bindInputs.length} {bindInputs.length === 1 ? 'parâmetro' : 'parâmetros'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Suporta binds (<span className="text-violet-400 font-mono">:VAR</span>), variáveis SQL*Plus/WinThor (
                <span className="text-amber-500 font-mono">&VAR</span>), scripts (<span className="text-sky-400 font-mono">@VAR</span>) e templates (<span className="text-pink-400 font-mono">{'${VAR}'}</span>).
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

        {/* Barra de Ações Rápidas do Modal */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-card hover:bg-muted border border-border text-foreground font-semibold text-[11px] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Adicionar Variável Manual</span>
              </button>
            ) : (
              <form onSubmit={handleAddNewVariable} className="flex items-center space-x-1.5 animate-fade-in">
                <select
                  value={newVarPrefix}
                  onChange={(e) => setNewVarPrefix(e.target.value as SqlVariablePrefix)}
                  className="bg-card border border-border text-foreground text-xs rounded px-1.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value=":">:</option>
                  <option value="&">&</option>
                  <option value="&&">&&</option>
                  <option value="@">@</option>
                  <option value="${}">{'${}'}</option>
                  <option value="#{}">{'#{}'}</option>
                </select>
                <input
                  type="text"
                  placeholder="NOME_VARIAVEL"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value.toUpperCase())}
                  className="w-36 bg-background border border-border rounded px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newVarName.trim()}
                  className="px-2 py-1 rounded bg-primary text-primary-foreground font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2 py-1 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </form>
            )}
          </div>

          {bindInputs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllValues}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition cursor-pointer"
              title="Limpar todos os campos preenchidos"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Valores</span>
            </button>
          )}
        </div>

        {/* Lista de Campos de Parâmetros */}
        <form onSubmit={onConfirmExecute} className="space-y-4">
          <div className="max-h-80 overflow-y-auto pr-1 space-y-2 [scrollbar-width:thin]">
            {bindInputs.length === 0 ? (
              <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-xl text-muted-foreground text-xs space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto opacity-30 text-violet-400" />
                <p className="font-semibold text-foreground">Nenhuma variável detectada no SQL.</p>
                <p className="text-[11px] max-w-sm mx-auto">
                  Você pode usar sintaxes como <span className="font-mono text-violet-400">:CODCLI</span>,{' '}
                  <span className="font-mono text-amber-500">&CODCLI</span> ou clicar em "Adicionar Variável Manual" acima.
                </p>
              </div>
            ) : (
              bindInputs.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 hover:border-violet-500/40 transition"
                >
                  {/* Identificador da Variável */}
                  <div className="flex items-center space-x-2 min-w-44">
                    <span className="font-mono font-bold text-xs text-foreground bg-card border border-border px-2 py-1 rounded flex items-center gap-1.5">
                      <span className="text-violet-400">{item.prefix || ':'}</span>
                      <span>{item.name}</span>
                    </span>
                    {getPrefixBadge(item.prefix)}
                  </div>

                  {/* Configuração do Tipo e Valor */}
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
                      <option value="auto">Auto (Texto/Número)</option>
                      <option value="string">Texto ('...')</option>
                      <option value="number">Número (123)</option>
                      <option value="date">Data (YYYY-MM-DD)</option>
                      <option value="list">Lista IN (1, 2, 3)</option>
                      <option value="null">Nulo (NULL)</option>
                    </select>

                    {/* Campo de Entrada de Valor */}
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
                        placeholder={
                          item.type === 'list'
                            ? "Ex: 1, 2, 3 ou 'A', 'B'"
                            : item.type === 'date'
                            ? 'YYYY-MM-DD'
                            : `Valor para ${item.prefix || ':'}${item.name}...`
                        }
                        value={item.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBindInputs((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, value: val } : p))
                          );
                        }}
                        className="flex-1 bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    )}

                    {/* Botão de Excluir da lista se foi adicionado ou não desejado */}
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(idx)}
                      className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                      title="Remover esta variável"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé com Ações */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onSubstituteInline}
              disabled={bindInputs.length === 0}
              className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Substitui as variáveis diretamente no editor SQL pelos valores informados"
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
                disabled={bindInputs.length === 0}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
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
