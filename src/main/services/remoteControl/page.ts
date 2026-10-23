import { PAGE_CSS } from './pageStyle';
import { PAGE_JS } from './pageScript';

const PAGE_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0f17">
<meta name="referrer" content="no-referrer">
<title>Hub Manager</title>
<link rel="stylesheet" href="app.css">
</head>
<body>
<header><h1>Hub Manager</h1><span id="task" class="chip">Ocioso</span></header>
<main id="view"></main>
<nav><div class="inner">
<button data-tab="ambiente">Ambiente</button>
<button data-tab="karaf">Karaf</button>
<button data-tab="docker">Docker</button>
<button data-tab="deploy">Deploy</button>
</div></nav>
<script src="app.js"></script>
</body>
</html>`;

/** Arquivos que o celular baixa do PC, por caminho relativo à chave. */
export const REMOTE_PAGE_FILES: Readonly<Record<string, { content: string; type: string }>> = {
  'index.html': { content: PAGE_HTML, type: 'text/html; charset=utf-8' },
  'app.css': { content: PAGE_CSS, type: 'text/css; charset=utf-8' },
  'app.js': { content: PAGE_JS, type: 'text/javascript; charset=utf-8' }
};
