export type LogLevelFilter = 'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface LogTextFilter {
  levelFilter: LogLevelFilter;
  filterText: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  invertFilter: boolean;
}

export interface LogLevelCounts {
  errorCount: number;
  warnCount: number;
  infoCount: number;
  debugCount: number;
}

export type LogRowKind = 'error' | 'warn' | 'info' | 'debug' | 'plain';

export const isErrorLine = (line: string): boolean => {
  const upper = line.toUpperCase();
  return upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('EXCEPTION');
};

const matchesLevel = (line: string, level: LogLevelFilter): boolean => {
  const upper = line.toUpperCase();
  if (level === 'ERROR') {
    return upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('EXCEPTION') || upper.includes('CAUSED BY:');
  }
  if (level === 'WARN') return upper.includes('WARN') || upper.includes('WARNING');
  if (level === 'INFO') return upper.includes('INFO');
  if (level === 'DEBUG') return upper.includes('DEBUG') || upper.includes('TRACE');
  return true;
};

export const filterLogLines = (lines: string[], filter: LogTextFilter): string[] => {
  const { levelFilter, filterText, isRegex, isCaseSensitive, invertFilter } = filter;
  let result = lines;

  if (levelFilter !== 'ALL') {
    result = result.filter((line) => matchesLevel(line, levelFilter));
  }

  if (filterText.trim()) {
    const query = filterText.trim();
    let testFn: (line: string) => boolean;

    if (isRegex) {
      try {
        const reg = new RegExp(query, isCaseSensitive ? '' : 'i');
        testFn = (line) => reg.test(line);
      } catch {
        // Regex inválida não deve esconder o log inteiro enquanto o usuário digita
        testFn = () => true;
      }
    } else if (isCaseSensitive) {
      testFn = (line) => line.includes(query);
    } else {
      const lowered = query.toLowerCase();
      testFn = (line) => line.toLowerCase().includes(lowered);
    }

    result = result.filter((line) => (invertFilter ? !testFn(line) : testFn(line)));
  }

  return result;
};

export const findErrorIndices = (lines: string[]): number[] => {
  const indices: number[] = [];
  lines.forEach((line, idx) => {
    if (isErrorLine(line)) indices.push(idx);
  });
  return indices;
};

export const countLogLevels = (lines: string[]): LogLevelCounts => {
  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;
  let debugCount = 0;

  for (const l of lines) {
    const upper = l.toUpperCase();
    if (isErrorLine(l)) errorCount++;
    else if (upper.includes('WARN')) warnCount++;
    else if (upper.includes('INFO')) infoCount++;
    else if (upper.includes('DEBUG') || upper.includes('TRACE')) debugCount++;
  }

  return { errorCount, warnCount, infoCount, debugCount };
};

export const getLogRowKind = (line: string): LogRowKind => {
  const upper = line.toUpperCase();
  if (isErrorLine(line)) return 'error';
  if (upper.includes('WARN') || upper.includes('WARNING')) return 'warn';
  if (upper.includes('INFO')) return 'info';
  if (upper.includes('DEBUG') || upper.includes('TRACE')) return 'debug';
  return 'plain';
};

export const isStackTraceLine = (line: string): boolean => {
  const trimmed = line.trimStart();
  return trimmed.startsWith('at ') || trimmed.startsWith('... ') || trimmed.startsWith('Caused by:');
};

export const isSystemNoticeLine = (line: string): boolean => line.startsWith('--- [');

/** Calcula o próximo/anterior índice de erro com navegação circular. */
export const pickNextErrorIndex = (
  errorIndices: number[],
  current: number,
  direction: 'next' | 'prev'
): number => {
  if (errorIndices.length === 0) return -1;
  if (direction === 'next') {
    const found = errorIndices.find((idx) => idx > current);
    return found !== undefined ? found : errorIndices[0];
  }
  const found = [...errorIndices].reverse().find((idx) => idx < current);
  return found !== undefined ? found : errorIndices[errorIndices.length - 1];
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const buildLogExportFileName = (sourceId: string, now: Date = new Date()): string =>
  `${sourceId}-log-${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
