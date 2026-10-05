import React from 'react';
import type { HelpCategory, HelpCategoryItem } from '../helpData';

interface HelpPageCategoryNavProps {
  categories: HelpCategoryItem[];
  activeCategory: HelpCategory;
  onSelect: (category: HelpCategory) => void;
}

/** Sub-navegação por pílulas temáticas. */
export const HelpPageCategoryNav: React.FC<HelpPageCategoryNavProps> = ({
  categories,
  activeCategory,
  onSelect
}) => (
  <div className="flex items-center space-x-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
    {categories.map((cat) => {
      const Icon = cat.icon;
      const isActive = activeCategory === cat.id;
      return (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id as HelpCategory)}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            isActive
              ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
              : 'bg-card/60 text-muted-foreground border-border hover:text-foreground hover:bg-card/90'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{cat.label}</span>
          {cat.badge && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {cat.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
