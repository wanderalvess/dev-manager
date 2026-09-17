import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Code,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  FolderOpen,
  Maximize2,
  Minimize2,
  Search,
  X,
  List,
  Sparkles,
  AlertTriangle,
  Info,
  AlertCircle,
  Flame,
  ChevronRight,
  Hash,
  Clock,
  Database
} from 'lucide-react';

interface MarkdownReaderProps {
  title: string;
  filePath: string;
  content: string;
  isLoading?: boolean;
  onClose: () => void;
  onOpenInEditor?: (filePath: string) => void;
  onOpenInFolder?: (filePath: string) => void;
}

interface HeadingItem {
  id: string;
  level: number;
  text: string;
}

type CalloutType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

export const MarkdownReader: React.FC<MarkdownReaderProps> = ({
  title,
  filePath,
  content,
  isLoading = false,
  onClose,
  onOpenInEditor,
  onOpenInFolder
}) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<'sm' | 'base' | 'lg'>('base');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // Fecha com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Estatísticas de leitura
  const stats = useMemo(() => {
    const text = content || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
    const bytes = new Blob([text]).size;
    const kb = (bytes / 1024).toFixed(1);
    return { words, readTimeMinutes, kb };
  }, [content]);

  // Extração do Sumário (Table of Contents)
  const headings = useMemo<HeadingItem[]>(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const items: HeadingItem[] = [];
    let inCodeBlock = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return;
      }
      if (inCodeBlock) return;

      const match = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/[#*`_~]/g, '').trim();
        const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        items.push({ id, level, text });
      }
    });

    return items;
  }, [content]);

  const handleCopyAll = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyCodeBlock = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsTocOpen(false);
    }
  };

  // Renderizador inline de formatação (negrito, itálico, código inline, links, highlights de busca)
  const renderInline = (text: string): React.ReactNode => {
    if (!text) return null;

    // Se houver busca ativa, destaca termos correspondentes
    if (searchTerm.trim().length >= 2) {
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-300 text-slate-900 dark:bg-amber-400 dark:text-slate-950 px-1 py-0.5 rounded-sm font-semibold">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{parseInlineMarkdown(part)}</React.Fragment>
        )
      );
    }

    return parseInlineMarkdown(text);
  };

  const parseInlineMarkdown = (str: string): React.ReactNode => {
    // Regex para código inline, negrito, itálico, links e imagens
    const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[([^\]]+)\]\(([^)]+)\))/g;
    const parts = str.split(tokenRegex);

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
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic text-foreground/90">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('~~') && part.endsWith('~~')) {
        return (
          <del key={index} className="line-through text-muted-foreground">
            {part.slice(2, -2)}
          </del>
        );
      }
      // Link markdown [texto](url)
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

  // Renderização estruturada de blocos Markdown
  const renderMarkdownBlocks = () => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let codeBlockCount = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Linha vazia
      if (!trimmed) {
        i++;
        continue;
      }

      // 1. Fenced Code Block (```lang ... ```)
      if (trimmed.startsWith('```')) {
        const langMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)/);
        const language = langMatch && langMatch[1] ? langMatch[1].toLowerCase() : 'code';
        const codeLines: string[] = [];
        i++;

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // consome o fechamento ```

        const fullCode = codeLines.join('\n');
        const codeIndex = codeBlockCount++;
        const isCopied = copiedCodeIndex === codeIndex;

        elements.push(
          <div key={`code-${codeIndex}`} className="my-5 rounded-2xl border border-border/80 overflow-hidden bg-slate-950 text-slate-100 shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-mono select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
                  {language}
                </span>
                <span className="text-slate-500 text-[10px]">{codeLines.length} linhas</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCodeBlock(fullCode, codeIndex)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[10px] font-bold cursor-pointer"
                title="Copiar código"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div className="p-4 overflow-x-auto font-mono text-[12px] leading-relaxed text-slate-200 selection:bg-cyan-500/30">
              <pre>
                <code>{fullCode}</code>
              </pre>
            </div>
          </div>
        );
        continue;
      }

      // 2. Callouts / GitHub Alerts (> [!NOTE], etc.)
      const alertMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
      if (alertMatch) {
        const type = alertMatch[1].toUpperCase() as CalloutType;
        const alertLines: string[] = [];
        if (alertMatch[2]) alertLines.push(alertMatch[2]);
        i++;

        while (i < lines.length && lines[i].trim().startsWith('>')) {
          alertLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }

        const alertStyles: Record<CalloutType, { bg: string; border: string; text: string; label: string; icon: any }> = {
          NOTE: {
            bg: 'bg-blue-500/10 dark:bg-blue-950/20',
            border: 'border-blue-500/40',
            text: 'text-blue-600 dark:text-blue-400',
            label: 'Nota Informativa',
            icon: Info
          },
          TIP: {
            bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
            border: 'border-emerald-500/40',
            text: 'text-emerald-600 dark:text-emerald-400',
            label: 'Dica & Boas Práticas',
            icon: Sparkles
          },
          IMPORTANT: {
            bg: 'bg-indigo-500/10 dark:bg-indigo-950/20',
            border: 'border-indigo-500/40',
            text: 'text-indigo-600 dark:text-indigo-400',
            label: 'Importante',
            icon: AlertCircle
          },
          WARNING: {
            bg: 'bg-amber-500/10 dark:bg-amber-950/20',
            border: 'border-amber-500/40',
            text: 'text-amber-600 dark:text-amber-400',
            label: 'Atenção / Aviso',
            icon: AlertTriangle
          },
          CAUTION: {
            bg: 'bg-rose-500/10 dark:bg-rose-950/20',
            border: 'border-rose-500/40',
            text: 'text-rose-600 dark:text-rose-400',
            label: 'Cuidado Crítico',
            icon: Flame
          }
        };

        const config = alertStyles[type] || alertStyles.NOTE;
        const IconComponent = config.icon;

        elements.push(
          <div key={`callout-${i}`} className={`my-4 p-4 rounded-2xl border ${config.bg} ${config.border} shadow-xs space-y-1.5`}>
            <div className={`flex items-center gap-2 font-bold text-xs ${config.text} uppercase tracking-wider`}>
              <IconComponent className="w-4 h-4" />
              <span>{config.label}</span>
            </div>
            <div className="text-[13px] text-foreground/90 leading-relaxed pl-6 space-y-1">
              {alertLines.map((al, idx) => (
                <p key={idx}>{renderInline(al)}</p>
              ))}
            </div>
          </div>
        );
        continue;
      }

      // 3. Blockquote normal (> ...)
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        elements.push(
          <blockquote
            key={`quote-${i}`}
            className="my-3 pl-4 border-l-4 border-primary/50 italic text-muted-foreground bg-muted/20 py-2 pr-3 rounded-r-xl"
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} className="leading-relaxed">
                {renderInline(ql)}
              </p>
            ))}
          </blockquote>
        );
        continue;
      }

      // 4. Headings (#, ##, ###, ####)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const headingId = `heading-${i}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        if (level === 1) {
          elements.push(
            <div key={`h1-${i}`} id={headingId} className="pt-6 pb-2 border-b border-border/80 my-4 scroll-mt-6">
              <div className="flex items-center gap-2 text-primary font-mono text-[11px] font-bold uppercase tracking-widest">
                <Hash className="w-3.5 h-3.5" /> Seção Principal
              </div>
              <h1 className="text-2xl font-black text-foreground tracking-tight mt-1">
                {renderInline(text)}
              </h1>
            </div>
          );
        } else if (level === 2) {
          elements.push(
            <div key={`h2-${i}`} id={headingId} className="pt-5 pb-1 border-b border-border/40 my-3 scroll-mt-6">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-5 bg-primary rounded-full inline-block shrink-0" />
                {renderInline(text)}
              </h2>
            </div>
          );
        } else if (level === 3) {
          elements.push(
            <h3 key={`h3-${i}`} id={headingId} className="text-base font-bold text-foreground mt-4 mb-1 scroll-mt-6 flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-primary shrink-0" />
              {renderInline(text)}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={`h4-${i}`} id={headingId} className="text-sm font-semibold text-foreground/90 mt-3 mb-1 scroll-mt-6 uppercase tracking-wider text-[12px]">
              {renderInline(text)}
            </h4>
          );
        }
        i++;
        continue;
      }

      // 5. Linha divisória horizontal (--- ou ***)
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
        elements.push(<hr key={`hr-${i}`} className="my-6 border-border/70" />);
        i++;
        continue;
      }

      // 6. Tabelas em Markdown (| Col 1 | Col 2 |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
        const headerCells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        i += 2; // pula o header e o divisor |---|---|

        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          const rowCells = lines[i]
            .trim()
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          rows.push(rowCells);
          i++;
        }

        elements.push(
          <div key={`table-${i}`} className="my-5 rounded-2xl border border-border/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/70 border-b border-border text-foreground font-bold">
                    {headerCells.map((hc, hIdx) => (
                      <th key={hIdx} className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">
                        {renderInline(hc)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-card' : 'bg-muted/20 hover:bg-muted/40 transition-colors'}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 text-foreground/90 leading-relaxed font-medium">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        continue;
      }

      // 7. Listas (Ordenadas, Não-Ordenadas e Checklist com Checkboxes)
      if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        const listItems: { text: string; isTask: boolean; checked?: boolean; isOrdered: boolean }[] = [];

        while (i < lines.length && (/^[-*+]\s+/.test(lines[i].trim()) || /^\d+\.\s+/.test(lines[i].trim()))) {
          const curTrim = lines[i].trim();
          const isOrdered = /^\d+\.\s+/.test(curTrim);
          const itemText = curTrim.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');

          // Checkbox [- [x]] ou [- [ ]]
          const taskMatch = itemText.match(/^\[([ xX])\]\s+(.*)$/);
          if (taskMatch) {
            listItems.push({
              text: taskMatch[2],
              isTask: true,
              checked: taskMatch[1].toLowerCase() === 'x',
              isOrdered
            });
          } else {
            listItems.push({
              text: itemText,
              isTask: false,
              isOrdered
            });
          }
          i++;
        }

        elements.push(
          <ul key={`list-${i}`} className="my-3 space-y-1.5 pl-2">
            {listItems.map((li, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-foreground/90 leading-relaxed text-[13.5px]">
                {li.isTask ? (
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-md mt-0.5 border text-[10px] shrink-0 font-bold ${
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
                <div className="flex-1">{renderInline(li.text)}</div>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 8. Parágrafo padrão
      elements.push(
        <p key={`p-${i}`} className="my-2.5 text-foreground/90 leading-relaxed font-normal">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  const fontSizeClass = {
    sm: 'text-xs md:text-[13px]',
    base: 'text-[14px] md:text-[15px]',
    lg: 'text-[16px] md:text-[17px]'
  }[fontSizeLevel];

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 transition-all duration-300 animate-in fade-in-0`}
    >
      <div
        className={`bg-card border border-border/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[90vh] rounded-3xl'
        }`}
      >
        {/* ========================================================================= */}
        {/* 1. BARRA SUPERIOR DE CABEÇALHO & AÇÕES DO COCKPIT                        */}
        {/* ========================================================================= */}
        <header className="px-5 py-3.5 border-b border-border/80 bg-muted/40 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/25 text-primary shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-foreground truncate tracking-tight">
                  {title}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-bold uppercase shrink-0">
                  Markdown
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono truncate max-w-lg" title={filePath}>
                {filePath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Alternância de Modo Formatado / Raw */}
            <div className="flex items-center bg-muted p-0.5 rounded-xl border border-border/80 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('formatted')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'formatted'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Formatado</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'raw'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Código Fonte</span>
              </button>
            </div>

            {/* Sumário / Tópicos */}
            {headings.length > 0 && viewMode === 'formatted' && (
              <button
                type="button"
                onClick={() => setIsTocOpen(!isTocOpen)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isTocOpen
                    ? 'bg-primary/15 border-primary text-primary shadow-xs'
                    : 'bg-card border-border hover:bg-muted text-foreground'
                }`}
                title="Sumário de tópicos do documento"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tópicos</span>
                <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-mono">{headings.length}</span>
              </button>
            )}

            {/* Copiar Todo o Conteúdo */}
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Copiar texto markdown completo"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="hidden sm:inline">{copiedAll ? 'Copiado!' : 'Copiar'}</span>
            </button>

            {/* Ações de Abertura Externa */}
            {onOpenInEditor && (
              <button
                type="button"
                onClick={() => onOpenInEditor(filePath)}
                className="p-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer"
                title="Abrir no editor de código configurado"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {onOpenInFolder && (
              <button
                type="button"
                onClick={() => onOpenInFolder(filePath)}
                className="p-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer"
                title="Revelar no Windows Explorer"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            )}

            {/* Tela Cheia */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer"
              title={isFullscreen ? 'Reduzir janela' : 'Modo tela cheia'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Fechar Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. SUB-BARRA DE FERRAMENTAS: BUSCA, ZOOM E METADADOS                     */}
        {/* ========================================================================= */}
        <div className="px-5 py-2.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            {/* Campo de Busca Rápida no Documento */}
            <div className="relative w-56 sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar palavras no documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-xl pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Controles de Zoom de Fonte */}
            {viewMode === 'formatted' && (
              <div className="flex items-center gap-1 bg-background border border-border/80 rounded-xl px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('sm')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                    fontSizeLevel === 'sm' ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Fonte compacta"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('base')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                    fontSizeLevel === 'base' ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Fonte normal"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel('lg')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                    fontSizeLevel === 'lg' ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Fonte confortável"
                >
                  A+
                </button>
              </div>
            )}
          </div>

          {/* Badges de Metadados de Leitura Humana */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>~{stats.readTimeMinutes} min de leitura</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{stats.words} palavras</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              <span>{stats.kb} KB</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. ÁREA DE LEITURA (COM PAINEL DE TÓPICOS OPCIONAL)                      */}
        {/* ========================================================================= */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Gaveta Retrátil de Sumário (TOC) */}
          {isTocOpen && headings.length > 0 && viewMode === 'formatted' && (
            <aside className="w-64 md:w-72 border-r border-border/80 bg-muted/40 flex flex-col shrink-0 animate-in slide-in-from-left-4 duration-200">
              <div className="p-3 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <List className="w-3.5 h-3.5 text-primary" />
                  Sumário de Seções
                </span>
                <button
                  type="button"
                  onClick={() => setIsTocOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-lg hover:bg-muted"
                >
                  ✕
                </button>
              </div>
              <div className="p-3 overflow-y-auto space-y-1 flex-1 text-xs">
                {headings.map((h, hIdx) => (
                  <button
                    key={hIdx}
                    type="button"
                    onClick={() => scrollToHeading(h.id)}
                    style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                    className="w-full text-left py-1.5 pr-2 rounded-lg hover:bg-primary/10 hover:text-primary text-foreground/80 transition-colors font-medium truncate cursor-pointer block"
                    title={h.text}
                  >
                    {h.text}
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Área Principal de Conteúdo */}
          <main ref={contentRef} className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Carregando documento...</span>
              </div>
            ) : viewMode === 'raw' ? (
              /* MODO CÓDIGO FONTE (RAW) */
              <div className="font-mono text-xs leading-relaxed text-foreground bg-muted/20 p-5 rounded-2xl border border-border/80 select-text whitespace-pre-wrap">
                {content || '(Arquivo vazio)'}
              </div>
            ) : (
              /* MODO FORMATADO HUMANO (RICH GFM RENDERER) */
              <article className={`max-w-4xl mx-auto ${fontSizeClass} select-text`}>
                {renderMarkdownBlocks()}
              </article>
            )}
          </main>
        </div>

        {/* ========================================================================= */}
        {/* 4. RODAPÉ INFORMATIVO COM BOTÃO DE FECHAR                                */}
        {/* ========================================================================= */}
        <footer className="px-5 py-3 border-t border-border/80 bg-muted/30 flex items-center justify-between text-xs shrink-0">
          <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
            <span className="font-bold text-foreground">Dica:</span> Pressione <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold">Esc</kbd> para fechar o leitor.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold transition cursor-pointer active:scale-95 shadow-xs"
          >
            Concluir Leitura
          </button>
        </footer>
      </div>
    </div>
  );
};
