import React from 'react';
import { ArrowUp, ArrowDown, Clock } from 'lucide-react';
import type { CleanContainer, SelectedSlotItem } from '../../../utils/saveEnvironmentUtils';

interface SaveEnvironmentContainerRowProps {
  container: CleanContainer;
  color: string;
  slot: SelectedSlotItem | null;
  slotIndex: number;
  slotCount: number;
  onToggle: (cleanName: string) => void;
  onUpdateDelay: (cleanName: string, delay: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}

export const SaveEnvironmentContainerRow: React.FC<SaveEnvironmentContainerRowProps> = ({
  container,
  color,
  slot,
  slotIndex,
  slotCount,
  onToggle,
  onUpdateDelay,
  onMove
}) => {
  const isSelected = slotIndex >= 0;

  return (
    <div
      className={`p-2.5 flex items-center justify-between gap-2 transition ${
        isSelected ? 'bg-primary/4' : 'hover:bg-muted/30'
      }`}
    >
      {/* Checkbox, Ordem e Nome */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(container.cleanName)}
          className="w-4 h-4 rounded text-primary border-border/80 focus:ring-primary focus:ring-1 cursor-pointer accent-primary shrink-0"
        />

        {isSelected && (
          <span
            className="w-5 h-5 rounded-full text-2xs font-mono font-bold flex items-center justify-center shrink-0 text-white shadow-2xs"
            style={{ backgroundColor: color }}
            title={`Ordem de inicialização: #${slotIndex + 1}`}
          >
            {slotIndex + 1}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-foreground truncate font-sans">
              {container.cleanName}
            </span>

            <span
              className={`text-2xs px-1.5 py-0.2 rounded font-semibold ${
                container.state === 'running'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {container.state === 'running' ? 'RODANDO' : 'PARADO'}
            </span>
          </div>

          <div className="text-2xs text-muted-foreground truncate font-mono mt-0.5">
            {container.image}
            {container.ports ? ` • ${container.ports}` : ''}
          </div>
        </div>
      </div>

      {/* Controles de Sequência e Delay (Apenas quando selecionado) */}
      {isSelected && slot && (
        <div className="flex items-center gap-1.5 shrink-0 bg-card p-1 rounded-lg border border-border/70 shadow-2xs">
          {/* Delay de inicialização em segundos */}
          <div className="flex items-center gap-1 text-2xs px-1.5 py-0.5" title="Delay de warm-up antes de iniciar o próximo container">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground text-2xs">Delay:</span>
            <input
              type="number"
              min="0"
              max="300"
              value={slot.delay}
              onChange={(e) => onUpdateDelay(container.cleanName, parseInt(e.target.value, 10))}
              className="w-12 bg-background border border-border rounded px-1 text-center text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground text-2xs">s</span>
          </div>

          {/* Mover para Cima / Baixo na Ordem */}
          <div className="flex items-center gap-0.5 border-l border-border pl-1">
            <button
              type="button"
              onClick={() => onMove(slotIndex, 'up')}
              disabled={slotIndex === 0}
              title="Subir na fila de inicialização" aria-label="Subir na fila de inicialização"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onMove(slotIndex, 'down')}
              disabled={slotIndex === slotCount - 1}
              title="Descer na fila de inicialização" aria-label="Descer na fila de inicialização"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
