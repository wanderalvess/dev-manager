import React from 'react';
import { Star } from 'lucide-react';
import type { QuickLauncherItem } from '../../utils/quickLauncherActions';

/** Renderiza o título destacando os caracteres que casaram com a busca fuzzy. */
const HighlightedText: React.FC<{ text: string; matchedIndices?: number[] }> = ({
  text,
  matchedIndices
}) => {
  if (!matchedIndices || matchedIndices.length === 0) return <>{text}</>;
  const matchSet = new Set(matchedIndices);
  return (
    <>
      {text.split('').map((char, idx) =>
        matchSet.has(idx) ? (
          <mark key={idx} className="bg-transparent text-amber-400 font-extrabold">
            {char}
          </mark>
        ) : (
          <React.Fragment key={idx}>{char}</React.Fragment>
        )
      )}
    </>
  );
};

interface QuickLauncherListProps {
  items: QuickLauncherItem[];
  selectedIndex: number;
  search: string;
  listRef: React.RefObject<HTMLDivElement>;
  onHover: (index: number) => void;
}

export const QuickLauncherList: React.FC<QuickLauncherListProps> = ({
  items,
  selectedIndex,
  search,
  listRef,
  onHover
}) => (
  <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
    {items.length === 0 ? (
      <div className="p-8 text-center text-muted-foreground text-xs">
        Nenhum resultado encontrado para <code className="font-mono text-foreground">{search}</code>
      </div>
    ) : (
      items.map((item, idx) => {
        const Icon = item.icon;
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={item.id}
            onClick={item.onSelect}
            onMouseEnter={() => onHover(idx)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'hover:bg-muted/60 text-foreground'
            }`}
          >
            <div className="flex items-center space-x-3 truncate">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isSelected
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted border border-border/60 text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold truncate">
                    <HighlightedText text={item.title} matchedIndices={item.titleMatchIndices} />
                  </span>
                  {item.isFavorite && (
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  )}
                </div>
                {item.subtitle && (
                  <p
                    className={`text-[11px] truncate ${
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>

            {item.badge && (
              <span
                className={`text-2xs font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                  isSelected
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-muted text-muted-foreground border-border/60'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        );
      })
    )}
  </div>
);
