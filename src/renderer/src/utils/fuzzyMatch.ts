/**
 * Fuzzy matcher no estilo "command palette" (VSCode/Sublime/Spotlight):
 * o termo buscado não precisa ser uma substring contígua — basta que seus
 * caracteres apareçam na mesma ordem dentro do alvo. Retorna um score de
 * relevância e os índices exatos que casaram, para permitir highlight na UI.
 */

export interface FuzzyMatchResult {
  /** Score de relevância — quanto maior, melhor o casamento. 0 quando não há match. */
  score: number;
  /** Índices (no texto alvo) dos caracteres que casaram com a query, em ordem. */
  matchedIndices: number[];
}

const NO_MATCH: FuzzyMatchResult = { score: 0, matchedIndices: [] };

/**
 * Tenta casar `query` contra `target` preservando a ordem dos caracteres.
 * Prioriza: correspondência exata > início de palavra > sequência contígua > proximidade.
 * Query vazia sempre "casa" com score 0 (nenhum destaque, mas não filtra o item).
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatchResult {
  if (!query) return NO_MATCH;
  if (!target) return { score: -1, matchedIndices: [] };

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Substring contígua: sempre vence, com bônus por casar no início.
  const directIdx = t.indexOf(q);
  if (directIdx !== -1) {
    const matchedIndices = Array.from({ length: q.length }, (_, i) => directIdx + i);
    const startBonus = directIdx === 0 ? 100 : isWordBoundary(t, directIdx) ? 60 : 0;
    return { score: 200 + startBonus + q.length * 2, matchedIndices };
  }

  // Fuzzy subsequence: cada caractere de q precisa aparecer em t, em ordem.
  const matchedIndices: number[] = [];
  let score = 0;
  let lastMatchIndex = -1;
  let qi = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;

    let charScore = 10;
    if (lastMatchIndex === ti - 1) charScore += 15; // sequência contígua
    if (isWordBoundary(t, ti)) charScore += 20; // início de palavra
    if (ti === 0) charScore += 10;

    score += charScore;
    matchedIndices.push(ti);
    lastMatchIndex = ti;
    qi++;
  }

  if (qi < q.length) return NO_MATCH; // nem todos os caracteres casaram

  // Penaliza levemente alvos muito mais longos que a query (menos preciso).
  score -= Math.max(0, target.length - query.length) * 0.5;

  return { score, matchedIndices };
}

function isWordBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  return prev === ' ' || prev === '-' || prev === '_' || prev === '.' || prev === '/';
}

/**
 * Combina o melhor resultado de fuzzyMatch entre múltiplos campos de um item
 * (ex: título e subtítulo), retornando o score mais alto e a origem do match.
 */
export function fuzzyMatchBest(
  query: string,
  fields: string[]
): FuzzyMatchResult & { fieldIndex: number } {
  if (!query) return { ...NO_MATCH, fieldIndex: -1 };

  let best: FuzzyMatchResult & { fieldIndex: number } = { score: -1, matchedIndices: [], fieldIndex: -1 };
  fields.forEach((field, fieldIndex) => {
    const result = fuzzyMatch(query, field);
    if (result.score > best.score) {
      best = { ...result, fieldIndex };
    }
  });

  return best.score > 0 ? best : { ...NO_MATCH, fieldIndex: -1 };
}
