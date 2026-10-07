import React from 'react';
import { Search } from 'lucide-react';
import type { CleanContainer, SelectedSlotItem } from '../../../utils/saveEnvironmentUtils';
import { SaveEnvironmentContainerRow } from './SaveEnvironmentContainerRow';

interface SaveEnvironmentContainerListProps {
  totalCount: number;
  filteredContainers: CleanContainer[];
  selectedSlots: SelectedSlotItem[];
  color: string;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  getSlotIndex: (cleanName: string) => number;
  onToggle: (cleanName: string) => void;
  onUpdateDelay: (cleanName: string, delay: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}

export const SaveEnvironmentContainerList: React.FC<SaveEnvironmentContainerListProps> = ({
  totalCount,
  filteredContainers,
  selectedSlots,
  color,
  searchFilter,
  onSearchChange,
  getSlotIndex,
  onToggle,
  onUpdateDelay,
  onMove
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Containers Disponíveis ({filteredContainers.length})
      </label>

      {totalCount > 5 && (
        <div className="relative w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filtrar containers..."
            className="w-full bg-background border border-border/80 rounded-lg pl-8 pr-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>

    {filteredContainers.length === 0 ? (
      <div className="p-4 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
        Nenhum container encontrado com o filtro "{searchFilter}".
      </div>
    ) : (
      <div className="border border-border/80 rounded-xl divide-y divide-border/60 max-h-64 overflow-y-auto bg-background/50">
        {filteredContainers.map((container) => {
          const slotIndex = getSlotIndex(container.cleanName);
          return (
            <SaveEnvironmentContainerRow
              key={container.id}
              container={container}
              color={color}
              slot={slotIndex >= 0 ? selectedSlots[slotIndex] : null}
              slotIndex={slotIndex}
              slotCount={selectedSlots.length}
              onToggle={onToggle}
              onUpdateDelay={onUpdateDelay}
              onMove={onMove}
            />
          );
        })}
      </div>
    )}
  </div>
);
