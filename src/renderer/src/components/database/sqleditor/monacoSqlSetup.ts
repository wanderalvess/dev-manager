import { monaco } from './monacoEntry';
import {
  computeSqlCompletions,
  type CompletionContext,
  type CompletionKind
} from '../../../utils/sqlCompletionUtils';

/** O que o provedor de sugestões precisa saber da tela: dialeto, tabelas, colunas em cache e como carregar as que faltam. */
export interface SqlEditorContextProvider {
  getContext: () => CompletionContext;
  /** Carrega as colunas de uma tabela e as deixa disponíveis em `getContext().getColumns`. */
  loadColumns: (tableKey: string) => Promise<void>;
}

const providers = new Map<string, SqlEditorContextProvider>();
const COLUMN_LOAD_TIMEOUT_MS = 2500;

export function registerEditorContext(modelUri: string, provider: SqlEditorContextProvider): void {
  providers.set(modelUri, provider);
}

export function unregisterEditorContext(modelUri: string): void {
  providers.delete(modelUri);
}

const KIND_MAP: Record<CompletionKind, monaco.languages.CompletionItemKind> = {
  keyword: monaco.languages.CompletionItemKind.Keyword,
  table: monaco.languages.CompletionItemKind.Class,
  column: monaco.languages.CompletionItemKind.Field,
  function: monaco.languages.CompletionItemKind.Function,
  snippet: monaco.languages.CompletionItemKind.Snippet
};

export const SQL_THEME = 'hub-sql-dark';
const LANGUAGES = ['sql', 'pgsql', 'mysql'] as const;
let configured = false;

function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  return Promise.race([promise.then(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}

/** Registra tema e provedor de sugestões uma única vez. */
export function ensureSqlSupport(): void {
  if (configured) return;
  configured = true;

  monaco.editor.defineTheme(SQL_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '7DD3FC', fontStyle: 'bold' },
      { token: 'predefined', foreground: 'C4B5FD' },
      { token: 'operator', foreground: 'CBD5E1' },
      { token: 'string', foreground: 'FCD34D' },
      { token: 'number', foreground: 'FB923C' },
      { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
      { token: 'identifier', foreground: '6EE7B7' }
    ],
    colors: {
      'editor.background': '#0B0F17',
      'editorGutter.background': '#080B11',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#F97316',
      'editor.lineHighlightBackground': '#131926',
      'editor.selectionBackground': '#1D4ED855',
      'editorSuggestWidget.background': '#131926',
      'editorSuggestWidget.border': '#334155',
      'editorSuggestWidget.selectedBackground': '#1E293B',
      'editorCursor.foreground': '#F97316'
    }
  });

  for (const language of LANGUAGES) {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['.'],
      provideCompletionItems: async (model, position) => {
        const provider = providers.get(model.uri.toString());
        if (!provider) return { suggestions: [] };

        const text = model.getValue();
        const offset = model.getOffsetAt(position);
        let result = computeSqlCompletions(text, offset, provider.getContext());

        // Colunas ainda não carregadas: busca (com limite de tempo) e recalcula com o cache atualizado
        if (result.needColumnsFor.length > 0) {
          await withTimeout(Promise.all(result.needColumnsFor.map((key) => provider.loadColumns(key))), COLUMN_LOAD_TIMEOUT_MS);
          result = computeSqlCompletions(text, offset, provider.getContext());
        }

        const start = model.getPositionAt(result.range.start);
        const range = new monaco.Range(start.lineNumber, start.column, position.lineNumber, position.column);
        return {
          suggestions: result.items.map((item) => ({
            label: item.label,
            kind: KIND_MAP[item.kind],
            insertText: item.insertText,
            insertTextRules: item.isSnippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            detail: item.detail,
            sortText: item.sortText,
            range
          }))
        };
      }
    });
  }
}

export function languageFor(dialect: 'oracle' | 'postgres' | 'mysql'): string {
  return dialect === 'postgres' ? 'pgsql' : dialect === 'mysql' ? 'mysql' : 'sql';
}
