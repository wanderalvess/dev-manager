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
  <div className="flex items-center gap-6 overflow-x-auto shrink-0 scrollbar-none border-b border-border">
    {categories.map((cat) => {
      const Icon = cat.icon;
      const isActive = activeCategory === cat.id;
      return (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id as HelpCategory)}
          className={`flex items-center space-x-2 py-3 text-sm transition-colors shrink-0 border-b-2 -mb-px cursor-pointer ${
            isActive
              ? 'text-foreground font-medium border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{cat.label}</span>
          {cat.badge && (
            <span
              className="text-xs px-2 rounded-full font-medium bg-muted text-muted-foreground"
            >
              {cat.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
