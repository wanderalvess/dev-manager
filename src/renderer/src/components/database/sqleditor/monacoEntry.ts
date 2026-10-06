// Entrada enxuta do Monaco: o núcleo do editor e só as contribuições de que o editor SQL precisa (busca, comentar
// linhas, múltiplos cursores, sugestões, snippets...). Importar 'monaco-editor' inteiro traria diff editor, LSP e
// serviços de CSS/HTML/JSON/TypeScript que o app não usa. Os caminhos seguem o editor.main.js do pacote.
import * as monaco from '@monaco/editor/editor.api.js';
import '@monaco/editor/contrib/bracketMatching/browser/bracketMatching.js';
import '@monaco/editor/contrib/clipboard/browser/clipboard.js';
import '@monaco/editor/browser/widget/codeEditor/codeEditorWidget.js';
import '@monaco/base/browser/ui/codicons/codicon/codicon.css';
import '@monaco/editor/contrib/comment/browser/comment.js';
import '@monaco/editor/contrib/contextmenu/browser/contextmenu.js';
import '@monaco/editor/contrib/cursorUndo/browser/cursorUndo.js';
import '@monaco/features/find/register.js';
import '@monaco/editor/contrib/folding/browser/folding.js';
import '@monaco/editor/contrib/hover/browser/hoverContribution.js';
import '@monaco/editor/contrib/indentation/browser/indentation.js';
import '@monaco/editor/contrib/lineSelection/browser/lineSelection.js';
import '@monaco/editor/contrib/linesOperations/browser/linesOperations.js';
import '@monaco/editor/contrib/multicursor/browser/multicursor.js';
import '@monaco/editor/contrib/placeholderText/browser/placeholderText.contribution.js';
import '@monaco/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js';
import '@monaco/editor/contrib/readOnlyMessage/browser/contribution.js';
import '@monaco/editor/contrib/smartSelect/browser/smartSelect.js';
import '@monaco/editor/contrib/snippet/browser/snippetController2.js';
import '@monaco/editor/contrib/tokenization/browser/tokenization.js';
import '@monaco/editor/contrib/unicodeHighlighter/browser/unicodeHighlighter.js';
import '@monaco/editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import '@monaco/editor/contrib/wordOperations/browser/wordOperations.js';
import '@monaco/editor/contrib/wordPartOperations/browser/wordPartOperations.js';
import '@monaco/editor/browser/coreCommands.js';
import '@monaco/editor/contrib/caretOperations/browser/caretOperations.js';
import '@monaco/editor/contrib/find/browser/findController.js';
import '@monaco/editor/contrib/suggest/browser/suggestController.js';
import '@monaco/editor/common/standaloneStrings.js';
import '@monaco/base/browser/ui/codicons/codicon/codicon-modifiers.css';
// Colorização de SQL (os tokenizadores são carregados sob demanda)
import '@monaco/languages/definitions/sql/register.js';
import '@monaco/languages/definitions/pgsql/register.js';
import '@monaco/languages/definitions/mysql/register.js';
// Worker do editor embutido como blob (sem depender de caminho de arquivo no Electron). Exige `worker-src blob:` no CSP.
import EditorWorker from './monacoEditor.worker?worker&inline';

type MonacoEnvironmentHost = { MonacoEnvironment?: { getWorker: () => Worker } };

const host = self as unknown as MonacoEnvironmentHost;
if (!host.MonacoEnvironment) {
  host.MonacoEnvironment = { getWorker: () => new EditorWorker() };
}

export { monaco };
