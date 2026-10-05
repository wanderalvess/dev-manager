import React from 'react';
import { Clock, Activity, Layers, Cpu } from 'lucide-react';
import type { KarafDeployStats } from '../../../utils/karafDeployHistoryUtils';

interface KarafDeployHistoryStatsProps {
  stats: KarafDeployStats;
}

export const KarafDeployHistoryStats: React.FC<KarafDeployHistoryStatsProps> = ({ stats }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 px-4 border-b border-slate-800/80 bg-slate-950/40 text-xs shrink-0">
    {/* Total */}
    <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
      <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
        <Layers className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Total Deploys</div>
        <div className="text-sm font-bold font-mono text-slate-100">{stats.total}</div>
      </div>
    </div>

    {/* Taxa de Sucesso */}
    <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
      <div className={`p-1.5 rounded-lg ${stats.failures === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
        <Activity className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Taxa de Sucesso</div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold font-mono text-slate-100">{stats.successRate}%</span>
          <span className={`w-2 h-2 rounded-full ${stats.failures === 0 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]'}`} />
        </div>
      </div>
    </div>

    {/* Duração Média */}
    <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
        <Clock className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Duração Média</div>
        <div className="text-sm font-bold font-mono text-slate-100">{stats.avgDuration}s</div>
      </div>
    </div>

    {/* Origem */}
    <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
        <Cpu className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Origem (MCP / UI)</div>
        <div className="text-xs font-bold font-mono text-slate-100">
          <span className="text-purple-400">{stats.mcpCount}</span> MCP · <span className="text-amber-400">{stats.uiCount}</span> UI
        </div>
      </div>
    </div>
  </div>
);
