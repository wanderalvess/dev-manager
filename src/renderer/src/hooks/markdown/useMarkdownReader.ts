import { useMemo, useState } from 'react';
import { parseMarkdownBlocks } from '../../utils/markdownReaderParser';
import { computeReadingStats, extractHeadings } from '../../utils/markdownReaderToc';

export type MarkdownViewMode = 'formatted' | 'raw';
export type MarkdownFontSize = 'sm' | 'base' | 'lg';

const COPY_FEEDBACK_MS = 2000;

export const useMarkdownReader = (content: string) => {
  const [viewMode, setViewMode] = useState<MarkdownViewMode>('formatted');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<MarkdownFontSize>('base');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const stats = useMemo(() => computeReadingStats(content), [content]);
  const headings = useMemo(() => extractHeadings(content), [content]);
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  const handleCopyAll = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), COPY_FEEDBACK_MS);
  };

  const handleCopyCodeBlock = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), COPY_FEEDBACK_MS);
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsTocOpen(false);
    }
  };

  return {
    viewMode,
    setViewMode,
    isFullscreen,
    setIsFullscreen,
    fontSizeLevel,
    setFontSizeLevel,
    searchTerm,
    setSearchTerm,
    isTocOpen,
    setIsTocOpen,
    copiedAll,
    copiedCodeIndex,
    stats,
    headings,
    blocks,
    handleCopyAll,
    handleCopyCodeBlock,
    scrollToHeading
  };
};
