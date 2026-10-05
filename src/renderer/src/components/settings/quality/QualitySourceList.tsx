import React from 'react';
import { CheckCheck } from 'lucide-react';
import { QualitySourceConfig } from '../../../../../shared/types';
import { isQualitySourceActive } from '../../../utils/qualityTabUtils';
import { QualitySourceRow } from './QualitySourceRow';

interface QualitySourceListProps {
  sources: QualitySourceConfig[];
  activeSourceId: string | undefined;
  testingQualityId: string | null;
  testResults: Record<string, { success: boolean; message: string }>;
  onTest: (source: QualitySourceConfig) => void;
  onSetActive: (id: string) => void;
  onEdit: (source: Partial<QualitySourceConfig>) => void;
  onDelete: (id: string) => void;
}

export const QualitySourceList: React.FC<QualitySourceListProps> = ({
  sources,
  activeSourceId,
  testingQualityId,
  testResults,
  onTest,
  onSetActive,
  onEdit,
  onDelete
}) => (
  <div className="space-y-2">
    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
      Fontes Configuradas ({sources.length}):
    </span>

    {sources.length === 0 ? (
      <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-2">
        <CheckCheck className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
        <p className="text-xs text-muted-foreground">
          Nenhuma fonte de qualidade configurada ainda. Clique em um dos templates acima para conectar seu Zephyr ou Jira!
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        {sources.map((source) => (
          <QualitySourceRow
            key={source.id}
            source={source}
            isCurrentActive={isQualitySourceActive(source, activeSourceId)}
            isTesting={testingQualityId === source.id}
            testResult={testResults[source.id]}
            onTest={onTest}
            onSetActive={onSetActive}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    )}
  </div>
);
