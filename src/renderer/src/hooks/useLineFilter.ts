import { useMemo, useState } from 'react';
import { filterTextLines } from '../utils/textLineFilter';

/** Estado de busca + texto filtrado linha a linha, para modais que exibem um log em `<pre>`. */
export function useLineFilter(text: string) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterTextLines(text, query), [text, query]);
  return { query, setQuery, filtered };
}
