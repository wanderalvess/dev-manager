import React from 'react';
import {
  containerCardGaugeTone,
  containerCardGaugeWidth,
  type ContainerCardGaugeTone
} from '../../../utils/containerCardKind';

interface ContainerCardGaugeProps {
  label: string;
  icon: React.ReactNode;
  percent: number;
  warnAbove: number;
  criticalAbove: number;
  /** Classe da cor "normal" (literal completa para o Tailwind enxergar). */
  normalClassName: string;
  valueText: string;
  valueClassName?: string;
}

const TONE_CLASS: Record<Exclude<ContainerCardGaugeTone, 'normal'>, string> = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500'
};

export const ContainerCardGauge: React.FC<ContainerCardGaugeProps> = ({
  label,
  icon,
  percent,
  warnAbove,
  criticalAbove,
  normalClassName,
  valueText,
  valueClassName = ''
}) => {
  const tone = containerCardGaugeTone(percent, warnAbove, criticalAbove);
  const barColor = tone === 'normal' ? normalClassName : TONE_CLASS[tone];

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </span>
      <div className="w-16 bg-background/80 h-1.5 rounded-full overflow-hidden border border-border/60">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: containerCardGaugeWidth(percent) }}
        />
      </div>
      <span className={`text-[10px] font-mono tabular-nums text-foreground font-semibold ${valueClassName}`.trimEnd()}>
        {valueText}
      </span>
    </div>
  );
};
