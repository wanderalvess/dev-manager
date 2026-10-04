import React from 'react';
import { Sparkles, FileCode2, Check, Copy, XCircle, AlertTriangle } from 'lucide-react';
import type { TautCsvIntakeResult } from '../../../../../shared/types';

interface TautIntakeTabProps {
  csvFileName: string;
  onCsvFileNameChange: (value: string) => void;
  processingIntake: boolean;
  onProcess: () => void;
  intakeResult: TautCsvIntakeResult | null;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

const copyButtonClass =
  'px-2 py-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition cursor-pointer';

const preClass =
  'p-3 rounded-lg bg-[#0B0F17] text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-border/50';

export const TautIntakeTab: React.FC<TautIntakeTabProps> = ({
  csvFileName,
  onCsvFileNameChange,
  processingIntake,
  onProcess,
  intakeResult,
  copiedKey,
  onCopy
}) => (
  <div className="rounded-xl bg-card border border-border shadow-xs p-4 space-y-4">
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-foreground">
          Orquestrador de Intake CSV — Subagente 0 (Agents.md)
        </h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Lê o arquivo CSV exportado do Zephyr Scale em <code className="font-mono">Insumo/</code>, valida as 11 regras arquiteturais do projeto TAUT e gera o bloco estruturado de intake pronto para implementar com IA.
      </p>
    </div>

    <div className="flex flex-col sm:flex-row items-center gap-2">
      <div className="relative flex-1 w-full">
        <FileCode2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={csvFileName}
          onChange={(e) => onCsvFileNameChange(e.target.value)}
          placeholder="ex: Insumo/pedido.csv ou pedido.csv"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        type="button"
        onClick={onProcess}
        disabled={processingIntake || !csvFileName.trim()}
        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
      >
        <Sparkles className={`w-3.5 h-3.5 ${processingIntake ? 'animate-spin' : ''}`} />
        <span>{processingIntake ? 'Processando...' : 'Processar com IA'}</span>
      </button>
    </div>

    {/* Resultado do Intake */}
    {intakeResult && (
      <div className="space-y-3 pt-2 border-t border-border/60">
        {/* Avisos e Bloqueantes */}
        {intakeResult.checklistBlockers.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-400">
              <XCircle className="w-4 h-4" />
              <span>Bloqueantes Identificados (Impedem Implementação):</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {intakeResult.checklistBlockers.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {intakeResult.checklistWarnings.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Avisos de Atenção:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {intakeResult.checklistWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Bloco de Intake Estruturado */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Bloco de Intake (Para Prompt de IA)</span>
            <button
              type="button"
              onClick={() => onCopy(intakeResult.intakeBlock, 'intake-block')}
              className={copyButtonClass}
            >
              {copiedKey === 'intake-block' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Bloco</span>
                </>
              )}
            </button>
          </div>
          <pre className={preClass}>{intakeResult.intakeBlock}</pre>
        </div>

        {/* Plano de Implementação */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Plano de Construção das 4 Camadas</span>
            <button
              type="button"
              onClick={() => onCopy(intakeResult.implementationPlan, 'plan-block')}
              className={copyButtonClass}
            >
              {copiedKey === 'plan-block' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Plano</span>
                </>
              )}
            </button>
          </div>
          <pre className={preClass}>{intakeResult.implementationPlan}</pre>
        </div>
      </div>
    )}
  </div>
);
