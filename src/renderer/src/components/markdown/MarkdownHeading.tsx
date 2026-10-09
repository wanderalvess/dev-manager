import React from 'react';
import { ChevronRight, Hash } from 'lucide-react';
import { MarkdownInline } from './MarkdownInline';

interface MarkdownHeadingProps {
  level: number;
  text: string;
  id: string;
  isFirst: boolean;
  searchTerm: string;
}

export const MarkdownHeading: React.FC<MarkdownHeadingProps> = ({ level, text, id, isFirst, searchTerm }) => {
  const inline = <MarkdownInline text={text} searchTerm={searchTerm} />;

  if (level === 1) {
    return (
      <div
        id={id}
        className={`${isFirst ? 'pt-0 pb-1.5 mb-3 mt-0' : 'pt-5 pb-2 my-4'} border-b border-border/80 scroll-mt-6`}
      >
        <div className="flex items-center gap-2 text-primary font-mono text-2xs font-bold uppercase tracking-widest">
          <Hash className="w-3.5 h-3.5" /> Seção Principal
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight mt-1">{inline}</h1>
      </div>
    );
  }

  if (level === 2) {
    return (
      <div
        id={id}
        className={`${isFirst ? 'pt-0 pb-1 mb-2.5 mt-0' : 'pt-4 pb-1 my-3'} border-b border-border/40 scroll-mt-6`}
      >
        <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <span className="w-1.5 h-5 bg-primary rounded-full inline-block shrink-0" />
          {inline}
        </h2>
      </div>
    );
  }

  if (level === 3) {
    return (
      <h3
        id={id}
        className={`text-base font-bold text-foreground ${isFirst ? 'mt-0' : 'mt-3.5'} mb-1 scroll-mt-6 flex items-center gap-1.5`}
      >
        <ChevronRight className="w-4 h-4 text-primary shrink-0" />
        {inline}
      </h3>
    );
  }

  return (
    <h4
      id={id}
      className={`text-sm font-semibold text-foreground/90 ${isFirst ? 'mt-0' : 'mt-2.5'} mb-1 scroll-mt-6 uppercase tracking-wider text-xs`}
    >
      {inline}
    </h4>
  );
};
