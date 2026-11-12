import { useMemo, useState } from 'react';

export function useMarkdownReader(content: string) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fontSizeLevel, setFontSizeLevel] = useState<'sm' | 'base' | 'lg'>('base');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const { blocks, headings, stats } = useMemo(() => {
    const lines = content.split('\n');
    const outBlocks: Array<{ type: string; text: string; id?: string }> = [];
    const outHeadings: Array<{ id: string; text: string; level: number }> = [];
    let inCode = false;
    let codeBuf: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        if (inCode) {
          outBlocks.push({ type: 'code', text: codeBuf.join('\n') });
          codeBuf = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        continue;
      }
      const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = hMatch[2].trim();
        const id = `h-${outHeadings.length}`;
        outHeadings.push({ id, text, level });
        outBlocks.push({ type: `h${level}`, text, id });
      } else if (line.trim()) {
        outBlocks.push({ type: 'p', text: line });
      }
    }

    const q = searchTerm.trim().toLowerCase();
    const filteredBlocks = q ? outBlocks.filter((b) => b.text.toLowerCase().includes(q)) : outBlocks;

    return {
      blocks: filteredBlocks,
      headings: outHeadings,
      stats: { lines: lines.length, words: content.split(/\s+/).filter(Boolean).length }
    };
  }, [content, searchTerm]);

  return {
    viewMode,
    setViewMode,
    headings,
    isTocOpen,
    setIsTocOpen,
    copiedAll,
    handleCopyAll: async () => {
      await navigator.clipboard?.writeText(content).catch(() => {});
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    },
    isFullscreen,
    setIsFullscreen,
    searchTerm,
    setSearchTerm,
    fontSizeLevel,
    setFontSizeLevel,
    stats,
    blocks,
    copiedCodeIndex,
    handleCopyCodeBlock: async (idx: number, code: string) => {
      await navigator.clipboard?.writeText(code).catch(() => {});
      setCopiedCodeIndex(idx);
      setTimeout(() => setCopiedCodeIndex(null), 1500);
    },
    scrollToHeading: (id: string) => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };
}
