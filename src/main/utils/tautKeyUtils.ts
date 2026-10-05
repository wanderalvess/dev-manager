// Chave de cenário Zephyr (ex.: PROJ-T123). Sem prefixo configurado, aceita qualquer projeto no formato `ABC-T123`.
const GENERIC_KEY_SOURCE = '[A-Z][A-Z0-9]+-T\\d+';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Prefixo informado pelo usuário, por exemplo `PROJ-T` (só letras, números e hífen). */
export const normalizeTautKeyPrefix = (prefix?: string): string => {
  const clean = (prefix || '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(clean) ? clean : '';
};

export const buildTautKeyRegex = (prefix?: string, flags = ''): RegExp => {
  const normalized = normalizeTautKeyPrefix(prefix);
  return new RegExp(normalized ? `${escapeRegExp(normalized)}\\d+` : GENERIC_KEY_SOURCE, flags);
};

/** Mesmo padrão ancorado no início, para validar o campo Key de um CSV. */
export const buildAnchoredTautKeyRegex = (prefix?: string): RegExp =>
  new RegExp(`^(?:${buildTautKeyRegex(prefix).source})`);

export const describeTautKeyPattern = (prefix?: string): string => `${normalizeTautKeyPrefix(prefix) || 'PROJ-T'}XXXX`;
