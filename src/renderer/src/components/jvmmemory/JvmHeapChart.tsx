import React from 'react';
import { Activity } from 'lucide-react';
import {
  buildChartGeometry,
  resolveStrokeColor,
  type JvmAlertLevel,
  type TelemetryPoint
} from '../../utils/jvmMemoryModalUtils';

interface JvmHeapChartProps {
  history: TelemetryPoint[];
  isNearOom: boolean;
  alertLevel: JvmAlertLevel;
}

// Gráfico SVG com histórico de Heap
export const JvmHeapChart: React.FC<JvmHeapChartProps> = ({ history, isNearOom, alertLevel }) => {
  if (history.length < 2) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-xs">
        <Activity className="w-8 h-8 animate-pulse mb-2 text-primary/40" />
        <span>Coletando amostras da JVM...</span>
      </div>
    );
  }

  const { chartWidth, chartHeight, paddingX, paddingY, innerW, innerH, points, pathD, areaD, warningY } =
    buildChartGeometry(history);
  const strokeColor = resolveStrokeColor(isNearOom, alertLevel);

  return (
    <div className="w-full select-none">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
        <defs>
          <linearGradient id="heapGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
          <pattern id="gridPattern" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="currentColor" className="text-border/20" strokeWidth="0.5" strokeDasharray="1 3" />
          </pattern>
        </defs>

        {/* Grade de fundo */}
        <rect x={paddingX} y={paddingY} width={innerW} height={innerH} fill="url(#gridPattern)" />

        {/* Eixos delimitadores */}
        <line
          x1={paddingX}
          y1={warningY}
          x2={chartWidth - paddingX}
          y2={warningY}
          stroke="#f59e0b"
          strokeOpacity="0.4"
          strokeDasharray="3 3"
        />
        <text
          x={chartWidth - paddingX - 4}
          y={warningY - 3}
          textAnchor="end"
          className="text-2xs fill-amber-500/70 font-mono tracking-tight"
        >
          LIMIAR 85%
        </text>

        {/* Eixo base */}
        <line
          x1={paddingX}
          y1={chartHeight - paddingY}
          x2={chartWidth - paddingX}
          y2={chartHeight - paddingY}
          stroke="currentColor"
          className="text-border/70"
          strokeWidth="1"
        />

        {/* Área preenchida */}
        <path d={areaD} fill="url(#heapGradient)" />

        {/* Linha de telemetria */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos de amostragem */}
        {points.map((p, idx) => {
          const isLast = idx === points.length - 1;
          return (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={isLast ? 3.5 : 1.5}
              fill={isLast ? strokeColor : '#0f172a'}
              stroke={strokeColor}
              strokeWidth={isLast ? 2 : 1}
            />
          );
        })}
      </svg>

      <div className="flex justify-between items-center text-2xs text-muted-foreground px-1 pt-1 font-mono tabular-nums">
        <span>{history[0]?.time}</span>
        <span className="text-muted-foreground/70 uppercase tracking-widest text-2xs">
          Janela Contínua ({history.length} amostras)
        </span>
        <span className="font-semibold text-foreground/90">{history[history.length - 1]?.time}</span>
      </div>
    </div>
  );
};
