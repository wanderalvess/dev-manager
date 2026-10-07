import React, { useState } from 'react';
import {
  X,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { DeployProfileHistoryEntry } from '../../../shared/types';
import { Modal } from './ui/Modal';

interface DeployHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: DeployProfileHistoryEntry[];
  onClear: () => Promise<void>;
}

export const DeployHistoryModal: React.FC<DeployHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClear
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  if (!isOpen) return null;

  const totalRuns = history.length;
  const successRuns = history.filter((h) => h.success).length;
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await onClear();
    } finally {
      setIsClearing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl h-[88vh] flex flex-col overflow-hidden"
      closeOnBackdrop={false}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Histórico de Execuções de Deploy
                <span className="text-2xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {totalRuns} {totalRuns === 1 ? 'registro' : 'registros'}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Últimas execuções de perfis de deploy com duração e status por etapa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo de Métricas */}
        {totalRuns > 0 && (
          <div className="px-6 py-3 border-b border-border bg-background grid grid-cols-3 gap-4 text-center">
            <div className="bg-muted/30 border border-border/60 rounded-xl p-2">
              <span className="text-[11px] text-muted-foreground block">Total Execuções</span>
              <span className="text-base font-bold font-mono text-foreground">{totalRuns}</span>
            </div>
            <div className="bg-muted/30 border border-border/60 rounded-xl p-2">
              <span className="text-[11px] text-muted-foreground block">Taxa de Sucesso</span>
              <span className={`text-base font-bold font-mono ${successRate >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {successRate}%
              </span>
            </div>
            <div className="bg-muted/30 border border-border/60 rounded-xl p-2">
              <span className="text-[11px] text-muted-foreground block">Com Sucesso / Falhas</span>
              <span className="text-base font-bold font-mono text-foreground">
                <span className="text-emerald-500">{successRuns}</span> / <span className="text-rose-500">{totalRuns - successRuns}</span>
              </span>
            </div>
          </div>
        )}

        {/* Lista de Execuções */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {totalRuns === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <History className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold">Nenhum histórico registrado ainda</p>
              <p className="text-xs max-w-sm mt-1">
                Ao executar um perfil de deploy, cada execução com seu tempo e etapas será salva automaticamente aqui.
              </p>
            </div>
          ) : (
            history.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const dateFormatted = new Date(entry.startedAt).toLocaleString();
              const durationSec = (entry.durationMs / 1000).toFixed(1);

              return (
                <div
                  key={entry.id}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    entry.success
                      ? 'border-border/80 bg-card hover:border-emerald-500/40'
                      : entry.aborted
                      ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                      : 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50'
                  }`}
                >
                  <div
                    onClick={() => toggleExpand(entry.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="shrink-0">
                        {entry.success ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : entry.aborted ? (
                          <div className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center">
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground truncate">{entry.profileName}</span>
                          <span
                            className={`text-2xs px-1.5 py-0.2 rounded-full font-mono font-bold uppercase tracking-wider ${
                              entry.success
                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                : entry.aborted
                                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            }`}
                          >
                            {entry.success ? 'Sucesso' : entry.aborted ? 'Cancelado' : 'Falhou'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {dateFormatted}
                          </span>
                          <span className="flex items-center gap-1 text-foreground/80">
                            <Clock className="w-3 h-3 text-primary" />
                            {durationSec}s
                          </span>
                          <span>
                            {entry.stepResults?.length || 0} {entry.stepResults?.length === 1 ? 'etapa' : 'etapas'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-muted-foreground p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-border/50 bg-muted/10 space-y-2 text-xs">
                      {entry.error && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-rose-600 dark:text-rose-300 text-[11px] font-mono break-all">
                          {entry.error}
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Detalhamento das Etapas:
                        </span>
                        {(entry.stepResults || []).map((step, sIdx) => (
                          <div
                            key={`${step.stepId}-${sIdx}`}
                            className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/50 text-[11px]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {step.success ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : step.ignoredError ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              )}
                              <span className="font-semibold text-foreground truncate">{step.stepName}</span>
                              <span className="text-2xs text-muted-foreground font-mono">({step.stepType})</span>
                              {step.ignoredError && (
                                <span className="text-2xs bg-amber-500/15 text-amber-500 px-1 rounded font-mono">
                                  tolerado
                                </span>
                              )}
                            </div>

                            <span className="text-2xs font-mono text-muted-foreground shrink-0 ml-2">
                              {(step.durationMs / 1000).toFixed(1)}s
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <div>
            {totalRuns > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isClearing}
                className="text-xs text-destructive hover:underline flex items-center gap-1 font-medium disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isClearing ? 'Limpando...' : 'Limpar Histórico'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-foreground bg-card hover:bg-muted border border-border rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
    </Modal>
  );
};
