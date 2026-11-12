import React from 'react';
import { CornerDownLeft, type LucideIcon } from 'lucide-react';

export interface QuickLauncherItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  badge?: string;
  icon: LucideIcon;
  action: () => void;
}

export const QuickLauncherList: React.FC<{
  items: QuickLauncherItem[];
  selectedIndex: number;
  search: string;
  listRef: React.RefObject<HTMLDivElement>;
  onHover: (idx: number) => void;
}> = ({ items, selectedIndex, search, listRef, onHover }) => (
  <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
    {items.length === 0 ? (
      <div className="py-10 text-center text-xs text-muted-foreground">Nenhum resultado para "{search}".</div>
    ) : (
      items.map((item, idx) => {
        const Icon = item.icon;
        const active = idx === selectedIndex;
        return (
          <button
            key={item.id}
            type="button"
            onMouseEnter={() => onHover(idx)}
            onClick={item.action}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition cursor-pointer ${
              active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="w-4 h-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{item.label}</div>
                {item.description && <div className="text-2xs text-muted-foreground truncate">{item.description}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-2xs text-muted-foreground">{item.category}</span>
              {item.badge && <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-2xs font-mono">{item.badge}</kbd>}
              {active && <CornerDownLeft className="w-3.5 h-3.5 text-primary" />}
            </div>
          </button>
        );
      })
    )}
  </div>
);
