import React from 'react';
import { Users, History } from 'lucide-react';
import type { TracerView } from '../../../utils/statementTracerUtils';

export const TracerViewTabs: React.FC<{
  view: TracerView;
  onChange: (view: TracerView) => void;
  sessionsCount: number;
  statementsCount: number;
}> = ({ view, onChange, sessionsCount, statementsCount }) => (
  <div className="flex items-center bg-card/60 border border-border/70 rounded-lg overflow-hidden text-xs w-fit">
    <button
      type="button"
      onClick={() => onChange('sessions')}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 font-semibold transition cursor-pointer ${
        view === 'sessions' ? 'bg-sky-500/20 text-sky-500' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Users className="w-3.5 h-3.5" />
      Linha do tempo ({sessionsCount})
    </button>
    <button
      type="button"
      onClick={() => onChange('recent')}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 font-semibold transition cursor-pointer border-l border-border/70 ${
        view === 'recent' ? 'bg-sky-500/20 text-sky-500' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <History className="w-3.5 h-3.5" />
      SQL capturado ({statementsCount})
    </button>
  </div>
);
