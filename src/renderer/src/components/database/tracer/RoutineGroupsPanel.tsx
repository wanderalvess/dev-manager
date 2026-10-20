import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { analyzeTracerCapture, type OracleCaptureState } from '../../../../../shared/types';
import { TracerEmptyState } from './TracerEmptyState';
import { RoutineGroupCard } from './RoutineGroupCard';

interface RoutineGroupsPanelProps {
  statements: OracleCaptureState['statements'];
  onInspect: (sqlId: string) => void;
}

/** Visão "Por rotina": o que cada módulo (exe Delphi, JDBC...) executou, com as lentas e as repetidas em destaque. */
export const RoutineGroupsPanel: React.FC<RoutineGroupsPanelProps> = ({ statements, onInspect }) => {
  const groups = useMemo(() => analyzeTracerCapture(statements), [statements]);

  if (groups.length === 0) {
    return (
      <TracerEmptyState
        icon={<Layers className="w-8 h-8 mx-auto opacity-30 text-info" />}
        title="Nenhuma instrução capturada ainda."
        subtitle="Dispare a ação na rotina: as consultas aparecem agrupadas pelo módulo que as executou (ex.: PCSIS2075)."
      />
    );
  }

  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
      {groups.map((group, index) => (
        <RoutineGroupCard key={group.key} group={group} defaultOpen={index === 0} onInspect={onInspect} />
      ))}
    </div>
  );
};
