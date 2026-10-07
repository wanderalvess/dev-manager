import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import type { TourStep } from '../tourSteps';

interface TourTooltipProps {
  tooltipRef: React.RefObject<HTMLDivElement>;
  style: React.CSSProperties;
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onFinish: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  tooltipRef,
  style,
  step,
  stepIndex,
  totalSteps,
  onFinish,
  onNext,
  onPrev
}) => {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div
      ref={tooltipRef}
      style={style}
      className="animate-tour-fade bg-card text-card-foreground rounded-2xl border border-border shadow-2xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-primary">
          <Sparkles className="w-4 h-4 shrink-0" />
          <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
        </div>
        <button
          type="button"
          onClick={onFinish}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0 cursor-pointer"
          title="Pular tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>

      <div className="flex items-center justify-between pt-1">
        <span className="text-2xs font-mono text-muted-foreground">
          {stepIndex + 1} de {totalSteps}
        </span>
        <div className="flex items-center gap-1.5">
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="h-7 px-2.5 rounded-lg text-xs font-semibold border border-border/60 hover:border-border text-muted-foreground hover:text-foreground transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? onFinish : onNext}
            className="h-7 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            {isLast ? 'Concluir' : 'Próximo'}
            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
