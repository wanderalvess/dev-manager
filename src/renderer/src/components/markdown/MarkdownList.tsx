import React from 'react';
import type { MarkdownListItem } from '../../utils/markdownReaderParser';
import { MarkdownInline } from './MarkdownInline';

interface MarkdownListProps {
  items: MarkdownListItem[];
  searchTerm: string;
}

export const MarkdownList: React.FC<MarkdownListProps> = ({ items, searchTerm }) => (
  <ul className="my-3 space-y-1.5 pl-2">
    {items.map((li, idx) => (
      <li key={idx} className="flex items-start gap-2.5 text-foreground/90 leading-relaxed text-[13.5px]">
        {li.isTask ? (
          <span
            className={`inline-flex items-center justify-center w-4 h-4 rounded-md mt-0.5 border text-2xs shrink-0 font-bold ${
              li.checked
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-border bg-muted/40 text-transparent'
            }`}
          >
            {li.checked ? '✓' : ''}
          </span>
        ) : li.isOrdered ? (
          <span className="text-[11px] font-bold text-primary font-mono shrink-0 mt-0.5 w-4 text-right">
            {idx + 1}.
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 inline-block" />
        )}
        <div className="flex-1">
          <MarkdownInline text={li.text} searchTerm={searchTerm} />
        </div>
      </li>
    ))}
  </ul>
);
