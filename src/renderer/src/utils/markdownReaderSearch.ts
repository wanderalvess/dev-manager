export const MIN_SEARCH_LENGTH = 2;

/** Cria o regex de destaque, escapando metacaracteres; null quando a busca está inativa. */
export const buildSearchRegex = (searchTerm: string): RegExp | null => {
  if (searchTerm.trim().length < MIN_SEARCH_LENGTH) return null;
  return new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
};
