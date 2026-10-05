import React from 'react';
import { AlertCircle } from 'lucide-react';
import { QaCorePayloadItem } from '../../../../../shared/types';
import { formatPayloadSummary } from '../../../utils/qaPayloadFetchUtils';

interface QaPayloadResultsListProps {
  results: QaCorePayloadItem[];
  selectedItem: QaCorePayloadItem | null;
  onSelectItem: (item: QaCorePayloadItem) => void;
  isSearching: boolean;
  error: string | null;
}

export const QaPayloadResultsList: React.FC<QaPayloadResultsListProps> = ({
  results,
  selectedItem,
  onSelectItem,
  isSearching,
  error
}) => {
  return (
    <div className="w-72 border-r border-border overflow-y-auto bg-background/30 p-2 space-y-1.5 shrink-0">
      {error && (
        <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-tight">{error}</span>
        </div>
      )}

      {results.map((item, idx) => {
        const summary = formatPayloadSummary(item);
        const isSelected = selectedItem === item;
        return (
          <div
            key={item.id || idx}
            onClick={() => onSelectItem(item)}
            className={`p-2 rounded-md border text-left cursor-pointer transition-colors ${
              isSelected
                ? 'bg-primary/10 border-primary text-foreground'
                : 'bg-card border-border hover:border-primary/50 text-muted-foreground'
            }`}
          >
            <div className="flex items-center justify-between text-2xs font-mono mb-1">
              <span className="font-bold text-primary">{summary.badge}</span>
              {summary.valueDisplay && (
                <span className="font-semibold text-foreground">{summary.valueDisplay}</span>
              )}
            </div>
            <div className="text-xs font-semibold text-foreground truncate">{summary.title}</div>
            <div className="text-2xs text-muted-foreground truncate mt-0.5">{summary.subtitle}</div>
          </div>
        );
      })}

      {!isSearching && results.length === 0 && !error && (
        <div className="text-center py-12 text-xs text-muted-foreground font-mono">
          Informe o filtro e clique em Buscar.
        </div>
      )}
    </div>
  );
};
