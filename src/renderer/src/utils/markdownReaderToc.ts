export interface HeadingItem {
  id: string;
  level: number;
  text: string;
}

export interface ReadingStats {
  words: number;
  readTimeMinutes: number;
  kb: string;
}

export const extractHeadings = (content: string): HeadingItem[] => {
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
};

export const computeReadingStats = (content: string): ReadingStats => {
  const text = content || '';
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
  const bytes = new Blob([text]).size;
  const kb = (bytes / 1024).toFixed(1);
  return { words, readTimeMinutes, kb };
};
