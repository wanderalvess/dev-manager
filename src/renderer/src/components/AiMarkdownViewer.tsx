import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface AiMarkdownViewerProps {
  content: string;
  className?: string;
}

export const AiMarkdownViewer: React.FC<AiMarkdownViewerProps> = ({ content, className = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderInline = (text: string): React.ReactNode => {
    if (!text) return null;

    // Tokenizer para: código inline, negrito, itálico, links
    const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[([^\]]+)\]\(([^)]+)\))/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Inline code
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-primary/10 border border-primary/25 text-primary font-mono text-[11px] font-semibold inline-block"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic text-foreground/90">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Strikethrough
      if (part.startsWith('~~') && part.endsWith('~~')) {
        return (
          <del key={index} className="line-through text-muted-foreground">
            {part.slice(2, -2)}
          </del>
        );
      }

      // Link [text](url)
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

  const renderBlocks = () => {
    if (!content) return null;

    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let i = 0;
    let blockIndex = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Linha em branco
      if (!trimmed) {
        i++;
        continue;
      }

      // 1. Fenced Code Block (```lang ... ```)
      if (trimmed.startsWith('```')) {
        const langMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)/);
        const language = langMatch && langMatch[1] ? langMatch[1].toLowerCase() : 'código';
        const codeLines: string[] = [];
        i++;

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // fecha ```

        const fullCode = codeLines.join('\n');
        const currentCodeIdx = blockIndex++;
        const isCopied = copiedIndex === currentCodeIdx;

        nodes.push(
          <div
            key={`code-${currentCodeIdx}`}
            className="my-3 rounded-xl border border-border/80 overflow-hidden bg-slate-950 text-slate-100 shadow-md"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono select-none">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
                  {language}
                </span>
                <span className="text-slate-500 text-[10px] hidden sm:inline">
                  {codeLines.length} {codeLines.length === 1 ? 'linha' : 'linhas'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(fullCode, currentCodeIdx)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-[10px] font-bold cursor-pointer"
                title="Copiar código para a área de transferência"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div className="p-3.5 overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-200 selection:bg-primary/30">
              <pre>
                <code>{fullCode}</code>
              </pre>
            </div>
          </div>
        );
        continue;
      }

      // 2. Headings (# H1, ## H2, ### H3, #### H4)
      const hMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = hMatch[2];
        const hKey = `h-${blockIndex++}`;

        if (level === 1 || level === 2) {
          nodes.push(
            <h4
              key={hKey}
              className="text-xs font-bold text-foreground mt-3 mb-1.5 pb-1 border-b border-border/60 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-3 rounded-full bg-primary inline-block" />
              <span>{renderInline(text)}</span>
            </h4>
          );
        } else {
          nodes.push(
            <h5 key={hKey} className="text-[11px] font-bold text-foreground mt-2.5 mb-1 flex items-center gap-1">
              <span>{renderInline(text)}</span>
            </h5>
          );
        }
        i++;
        continue;
      }

      // 3. Unordered list (- item ou * item)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          listItems.push(lines[i].trim().slice(2));
          i++;
        }

        nodes.push(
          <ul key={`ul-${blockIndex++}`} className="my-1.5 space-y-1 pl-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-1.5 shrink-0" />
                <span className="flex-1">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 4. Ordered list (1. item, 2. item)
      const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (olMatch) {
        const listItems: Array<{ num: string; text: string }> = [];
        while (i < lines.length) {
          const m = lines[i].trim().match(/^(\d+)\.\s+(.+)$/);
          if (!m) break;
          listItems.push({ num: m[1], text: m[2] });
          i++;
        }

        nodes.push(
          <ol key={`ol-${blockIndex++}`} className="my-1.5 space-y-1.5 pl-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-muted text-primary border border-border shrink-0 mt-0.5">
                  {item.num}
                </span>
                <span className="flex-1">{renderInline(item.text)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // 5. Parágrafo comum
      nodes.push(
        <p key={`p-${blockIndex++}`} className="text-xs text-foreground/90 leading-relaxed my-1">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return nodes;
  };

  return <div className={`space-y-1 text-xs text-foreground/95 ${className}`}>{renderBlocks()}</div>;
};
