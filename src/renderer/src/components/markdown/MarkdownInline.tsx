import React from 'react';
import { ExternalLink } from 'lucide-react';
import { buildSearchRegex } from '../../utils/markdownReaderSearch';

// Sem grupos de captura internos para não duplicar partes no split
const TOKEN_REGEX = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;

const parseInlineMarkdown = (str: string): React.ReactNode => {
  const parts = str.split(TOKEN_REGEX);

  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-mono text-[0.88em] font-medium inline-block mx-0.5"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {parseInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-foreground/90">
          {parseInlineMarkdown(part.slice(1, -1))}
        </em>
      );
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return (
        <del key={index} className="line-through text-muted-foreground">
          {parseInlineMarkdown(part.slice(2, -2))}
        </del>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5 mx-0.5"
        >
          {label}
          <ExternalLink className="w-2.5 h-2.5 inline opacity-70" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

interface MarkdownInlineProps {
  text: string;
  searchTerm: string;
}

/** Renderiza formatação inline (negrito, itálico, código, links) e destaca termos da busca. */
export const MarkdownInline: React.FC<MarkdownInlineProps> = ({ text, searchTerm }) => {
  if (!text) return null;

  const regex = buildSearchRegex(searchTerm);
  if (regex) {
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-300 text-slate-900 dark:bg-amber-400 dark:text-slate-950 px-1 py-0.5 rounded-sm font-semibold">
              {part}
            </mark>
          ) : (
            <React.Fragment key={i}>{parseInlineMarkdown(part)}</React.Fragment>
          )
        )}
      </>
    );
  }

  return <>{parseInlineMarkdown(text)}</>;
};
