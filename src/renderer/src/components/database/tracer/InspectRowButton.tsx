import React from 'react';
import { Sliders } from 'lucide-react';

export const InspectRowButton: React.FC<{ onInspect: () => void }> = ({ onInspect }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onInspect();
    }}
    className="p-1 text-muted-foreground hover:text-sky-400 transition cursor-pointer rounded hover:bg-muted/40"
    title="Inspecionar parâmetros e SQL interpolado"
  >
    <Sliders className="w-3.5 h-3.5" />
  </button>
);
