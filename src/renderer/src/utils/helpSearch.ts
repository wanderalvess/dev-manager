import type { HelpCategory } from '../components/help/helpSections';

export type HelpSearchKind = 'faq' | 'module' | 'shortcut';

export interface HelpSearchEntry {
  id: string;
  kind: HelpSearchKind;
  label: string;
  /** Linha de apoio: categoria da pergunta, resumo do módulo ou a tecla. */
  hint: string;
  /** Seção da Ajuda que o resultado abre. */
  category: HelpCategory;
  /** Só nas perguntas: id para abrir e rolar até ela. */
  faqId?: string;
  keywords: string;
}

interface HelpSearchSources {
  faqs: { id: string; question: string; category: string; tags: string[] }[];
  modules: { title: string; description: string }[];
  shortcuts: { key: string; desc: string }[];
}

export const HELP_SEARCH_KIND_LABEL: Record<HelpSearchKind, string> = {
  faq: 'Problema',
  module: 'Módulo',
  shortcut: 'Atalho'
};

const COMBINING_MARKS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');

/** Sem acento e em minúsculas: "configuracoes" acha "Configurações". */
export function normalizeHelpText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/** Índice único para a busca da Ajuda: perguntas do FAQ, módulos e atalhos de teclado. */
export function buildHelpSearchIndex({ faqs, modules, shortcuts }: HelpSearchSources): HelpSearchEntry[] {
  return [
    ...faqs.map<HelpSearchEntry>((f) => ({
      id: `faq:${f.id}`,
      kind: 'faq',
      label: f.question,
      hint: f.category,
      category: 'faq',
      faqId: f.id,
      keywords: `${f.category} ${f.tags.join(' ')}`
    })),
    ...modules.map<HelpSearchEntry>((m) => ({
      id: `module:${m.title}`,
      kind: 'module',
      label: m.title,
      hint: m.description,
      category: 'modules',
      keywords: m.description
    })),
    ...shortcuts.map<HelpSearchEntry>((s) => ({
      id: `shortcut:${s.key}`,
      kind: 'shortcut',
      label: s.desc,
      hint: s.key,
      category: 'shortcuts',
      keywords: s.key
    }))
  ];
}

/** Acertos no título vêm antes dos acertos só em tags/resumo; dentro de cada grupo vale a ordem do índice. */
export function searchHelp(index: HelpSearchEntry[], query: string, limit = 8): HelpSearchEntry[] {
  const needle = normalizeHelpText(query.trim());
  if (!needle) return [];
  const inLabel: HelpSearchEntry[] = [];
  const inKeywords: HelpSearchEntry[] = [];
  for (const entry of index) {
    if (normalizeHelpText(entry.label).includes(needle)) inLabel.push(entry);
    else if (normalizeHelpText(entry.keywords).includes(needle)) inKeywords.push(entry);
  }
  return [...inLabel, ...inKeywords].slice(0, limit);
}
