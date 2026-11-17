import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { SystemHealthSample } from '../../utils/systemHealthUtils';

interface MemorySlice {
  name: string;
  value: number;
  fill: string;
}

interface SystemHealthChartsProps {
  history: SystemHealthSample[];
  latest: SystemHealthSample;
  memoryBreakdown: MemorySlice[];
}

export const SystemHealthCharts: React.FC<SystemHealthChartsProps> = ({
  history,
  latest,
  memoryBreakdown
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1 items-stretch">
      <div className="lg:col-span-2 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">
            Histórico de CPU e Memória (%)
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-primary inline-block" />
              CPU
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-info inline-block" />
              Memória
            </span>
          </div>
        </div>
        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <AreaChart data={history} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--theme-primary)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--theme-primary)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--theme-info)" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="var(--theme-info)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 11, fill: 'var(--theme-muted-foreground)' }}
                axisLine={{ stroke: 'var(--theme-border)' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: 'var(--theme-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--theme-card)',
                  borderColor: 'var(--theme-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--theme-foreground)'
                }}
                formatter={(value, name) => [`${value ?? 0}%`, name === 'cpuPercent' ? 'CPU' : 'Memória']}
              />
              <Area
                type="monotone"
                dataKey="cpuPercent"
                name="cpuPercent"
                stroke="var(--theme-primary)"
                strokeWidth={2}
                fill="url(#cpuGradient)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="memPercent"
                name="memPercent"
                stroke="var(--theme-info)"
                strokeWidth={2}
                fill="url(#memGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col lg:border-l lg:border-border lg:pl-6">
        <div className="text-xs font-semibold text-foreground mb-2">
          Alocação de Memória (GB)
        </div>
        <div className="h-[180px] w-full min-w-0 relative">
          <ResponsiveContainer width="100%" height={180} minWidth={0}>
            <PieChart>
              <Pie
                data={memoryBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={74}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {memoryBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--theme-card)',
                  borderColor: 'var(--theme-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--theme-foreground)'
                }}
                formatter={(value) => [`${Number(value ?? 0).toFixed(1)} GB`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold font-mono tabular-nums text-foreground">
              {latest.memPercent}%
            </span>
            <span className="text-2xs text-muted-foreground">RAM em uso</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs font-mono tabular-nums text-muted-foreground">
          <span>Em uso: <strong className="text-foreground">{latest.usedMemGb.toFixed(1)} GB</strong></span>
          <span>Livre: <strong className="text-foreground">{latest.freeMemGb.toFixed(1)} GB</strong></span>
        </div>
      </div>
    </div>
  );
};
