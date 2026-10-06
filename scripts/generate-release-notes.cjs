/**
 * Script de geração de notas de versão e guia de instalação para a release.
 *
 * Gera automaticamente na pasta de saída (padrão: release/):
 * - RELEASE_NOTES.md (formato Markdown para GitHub Releases, GitLab e documentações)
 * - LEIA-ME.txt (formato texto puro com quebras CRLF para abertura no Bloco de Notas)
 *
 * Pode ser executado via CLI:
 *   node scripts/generate-release-notes.cjs [--output-dir release] [--version 1.15.0]
 * Ou importado em scripts de build:
 *   const { generateReleaseNotes } = require('./generate-release-notes.cjs');
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');
const DEFAULT_RELEASE_DIR = path.join(ROOT_DIR, 'release');

function formatDateBr(isoDate) {
  if (!isoDate) return 'Data não especificada';
  const match = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function normalizeVersion(ver) {
  return String(ver || '').trim().replace(/^v/i, '');
}

function extractVersionChangelog(changelogContent, targetVersion) {
  if (!changelogContent) return null;

  const lines = changelogContent.split(/\r?\n/);
  const versionRegex = /^##\s*\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/;
  const headers = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(versionRegex);
    if (match) {
      headers.push({
        lineIndex: i,
        version: match[1].trim(),
        date: match[2] ? match[2].trim() : null,
        raw: lines[i].trim()
      });
    }
  }

  if (headers.length === 0) return null;

  let selectedIndex = 0;
  if (targetVersion) {
    const normTarget = normalizeVersion(targetVersion);
    const foundIndex = headers.findIndex((h) => normalizeVersion(h.version) === normTarget);
    if (foundIndex === -1) {
      return null;
    }
    selectedIndex = foundIndex;
  }

  const selectedHeader = headers[selectedIndex];
  const startLine = selectedHeader.lineIndex + 1;
  const endLine =
    selectedIndex + 1 < headers.length ? headers[selectedIndex + 1].lineIndex : lines.length;

  const bodyLines = lines.slice(startLine, endLine);
  const body = bodyLines.join('\n').trim();

  return {
    version: selectedHeader.version,
    date: selectedHeader.date,
    body,
    rawHeader: selectedHeader.raw
  };
}

function markdownToPlainText(md) {
  if (!md) return '';

  return md
    .replace(/^###\s*(.+)$/gm, (_match, title) => `\n[${title.trim().toUpperCase()}]`)
    .replace(/^##\s*(.+)$/gm, (_match, title) => `\n=== ${title.trim().toUpperCase()} ===`)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatReleaseNotesMarkdown(opts) {
  const productName = opts.productName || 'Hub Manager';
  const version = opts.version || '1.0.0';
  const dateFormatted = formatDateBr(opts.date);
  const installerFile = opts.installerFileName || `${productName} Setup ${version}.exe`;
  const portableFile = opts.portableFileName || `${productName} ${version}.exe`;
  const changelogBody = opts.changelogBody || 'Consulte o arquivo CHANGELOG.md para a lista detalhada de alterações.';
  const author = opts.author || 'Wanderson Alves';
  const repoUrl = opts.repoUrl || 'https://github.com/wanderalvess/dev-manager';

  return `# ${productName} - v${version} 🚀

> **Data de Lançamento:** ${dateFormatted}  
> **Status:** Versão Estável de Produção

---

## 📦 Arquivos Disponíveis nesta Release

Escolha o formato ideal para seu uso no Windows:

| Arquivo | Tipo | Descrição & Indicação |
| :--- | :--- | :--- |
| **\`${installerFile}\`** | **Instalador Completo (Recomendado)** | Assistente de instalação tradicional para Windows. Cria atalhos na Área de Trabalho e Menu Iniciar, permite personalizar a pasta de destino e suporta atualização automática e desinstalação pelo Painel de Controle. |
| **\`${portableFile}\`** | **Executável Portátil (Portable)** | Execução direta sem necessidade de instalação ou privilégios de administrador. Ideal para pendrives, ambientes corporativos restritos ou testes rápidos. |

---

## 🚀 Como Instalar e Executar

1. **Download:** Baixe o instalador (\`${installerFile}\`) ou o executável portátil (\`${portableFile}\`).
2. **Execução:** Dê um duplo clique no arquivo baixado. Não é necessário ser Administrador para a instalação padrão.
3. **Aviso do Windows SmartScreen ("O Windows protegeu o seu computador"):**
   - Em caso de exibição da tela azul de segurança do SmartScreen:
   - Clique no link **"Mais informações"**.
   - Em seguida, clique no botão **"Executar assim mesmo"**.
   *(Esse aviso é normal para novos executáveis internos/corporativos até acumularem reputação na rede da Microsoft).*
4. **Pronto!** O ${productName} abrirá imediatamente.

---

## 💻 Requisitos do Sistema

- **Sistema Operacional:** Windows 10 ou Windows 11 (64-bit)
- **Memória RAM:** Mínimo de 4 GB recomendados
- **Permissões:** Nível de usuário padrão (\`asInvoker\`). Para gerenciar serviços de sistema do Windows ou parar processos bloqueados, execute o app como Administrador quando solicitado.
- **Opcionais (conforme uso):**
  - **Docker Desktop / Podman:** Para controle de contêineres e métricas em tempo real.
  - **Apache Karaf & JDK 8+:** Para o deployer de bundles OSGi e console interativo.
  - **Oracle / Postgres / MySQL:** Para conexões diretas via Database Studio.

---

## 📋 Novidades e Alterações da Versão v${version}

${changelogBody}

---

## ⌨️ Atalhos Rápidos Globais

- \`Ctrl + K\`: **Quick Launcher** (Spotlight universal para comandos, rotinas e navegação)
- \`Alt + 1\`: Cockpit de **Ambiente Dev** & Serviços Windows
- \`Alt + 2\`: **Database Studio** & Central de Backup
- \`Alt + 3\`: Cockpit de **Containers** (Docker/Podman)
- \`Alt + 4\`: Deployer **Karaf OSGi**
- \`Alt + 5\`: Hub **Git & Azure DevOps**
- \`Alt + 6\`: Catálogo de **Rotinas WinThor**
- \`Alt + 7\`: **Documentação & RAG** Local
- \`Alt + 8\`: Observador de **Logs** em Tempo Real
- \`Alt + 9\`: **Central de Ajuda & Diagnóstico**
- \`Alt + 0\`: **APM & Traces** (OpenTelemetry)

---

<p align="center">
  <b>${productName}</b> • Repositório: <a href="${repoUrl}">${repoUrl}</a><br>
  Desenvolvido por <b>${author}</b> • Cockpit integrado para produtividade e automação
</p>
`;
}

function formatReleaseNotesText(opts) {
  const productName = opts.productName || 'Hub Manager';
  const version = opts.version || '1.0.0';
  const dateFormatted = formatDateBr(opts.date);
  const installerFile = opts.installerFileName || `${productName} Setup ${version}.exe`;
  const portableFile = opts.portableFileName || `${productName} ${version}.exe`;
  const rawChangelog = opts.changelogBody || 'Consulte o arquivo CHANGELOG.md para a lista detalhada de alteracoes.';
  const author = opts.author || 'Wanderson Alves';
  const repoUrl = opts.repoUrl || 'https://github.com/wanderalvess/dev-manager';

  const plainChangelog = markdownToPlainText(rawChangelog);

  const lines = [
    '================================================================================',
    `  ${productName.toUpperCase()} - NOTAS DE VERSAO E GUIA DE INSTALACAO`,
    `  Versao: v${version}`,
    `  Data:   ${dateFormatted}`,
    '================================================================================',
    '',
    '1. QUAL ARQUIVO EXECUTAR?',
    '--------------------------------------------------------------------------------',
    'Esta release contem duas opcoes de executaveis para Windows:',
    '',
    `A) ${installerFile}  [RECOMENDADO]`,
    '   - Instalador tradicional com assistente passo a passo.',
    '   - Cria atalhos na Area de Trabalho e no Menu Iniciar.',
    '   - Permite escolher o diretorio de instalacao.',
    '   - Suporta atualizacao automatica e desinstalacao pelo Windows.',
    '',
    `B) ${portableFile}  [VERSAO PORTATIL / PORTABLE]`,
    '   - Executa diretamente sem necessidade de instalacao previa.',
    '   - Nao requer privilegios de administrador.',
    '   - Ideal para rodar a partir de qualquer pasta, pendrive ou rede corporativa.',
    '',
    '',
    '2. COMO INSTALAR E EXECUTAR',
    '--------------------------------------------------------------------------------',
    `Passo 1: De duplo clique no arquivo (${installerFile} ou ${portableFile}).`,
    '',
    'Passo 2 - IMPORTANTE (Aviso do Windows SmartScreen):',
    '   Se o Windows exibir a mensagem "O Windows protegeu o seu computador":',
    '   1. Clique no link "Mais informacoes".',
    '   2. Clique no botao "Executar assim mesmo".',
    '   (Aviso padrao para novos executaveis internos que ainda nao acumularam',
    '    reputacao publica nos servidores da Microsoft).',
    '',
    `Passo 3: O ${productName} sera iniciado imediatamente!`,
    '',
    '',
    '3. REQUISITOS DO SISTEMA',
    '--------------------------------------------------------------------------------',
    '- Sistema Operacional: Windows 10 ou Windows 11 (64-bit).',
    '- Memoria RAM recomendada: 4 GB ou superior.',
    '- Permissoes de usuario padrao (nao exige elevação de Administrador para rodar).',
    '- Opcional: Docker Desktop / Podman para gerenciamento de contêineres.',
    '- Opcional: Apache Karaf e Java JDK para tarefas do ambiente OSGi.',
    '',
    '',
    `4. O QUE HA DE NOVO NA VERSAO v${version}`,
    '--------------------------------------------------------------------------------',
    plainChangelog,
    '',
    '',
    '5. ATALHOS RAPIDOS NO SISTEMA',
    '--------------------------------------------------------------------------------',
    '- Ctrl + K : Busca rapida Spotlight (comandos, rotinas e navegacao)',
    '- Alt + 1  : Ambiente Dev & Servicos Windows',
    '- Alt + 2  : Database Studio & Backup',
    '- Alt + 3  : Containers Docker / Podman',
    '- Alt + 4  : Deployer Karaf OSGi',
    '- Alt + 5  : Hub Git & Azure DevOps',
    '- Alt + 6  : Catalogo de Rotinas WinThor',
    '- Alt + 7  : Documentacao & RAG Local',
    '- Alt + 8  : Observador de Logs em Tempo Real',
    '- Alt + 9  : Central de Ajuda & Diagnostico',
    '- Alt + 0  : APM & Traces (OpenTelemetry)',
    '',
    '================================================================================',
    `  ${productName} - Desenvolvido por ${author}`,
    `  Repositorio: ${repoUrl}`,
    '================================================================================',
    ''
  ];

  return lines.join('\r\n');
}

/**
 * Função principal para geração dos arquivos de notas da release.
 */
function generateReleaseNotes(customOutputDir, customVersion) {
  let pkg = {};
  if (fs.existsSync(PACKAGE_JSON_PATH)) {
    try {
      pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    } catch (err) {
      console.warn('[ReleaseNotes] Aviso ao ler package.json:', err.message);
    }
  }

  const productName = 'Hub Manager';
  const version = customVersion || pkg.version || '1.0.0';
  const author = pkg.author || 'Wanderson Alves';
  const repoUrl = 'https://github.com/wanderalvess/dev-manager';
  const outputDir = customOutputDir || DEFAULT_RELEASE_DIR;

  let changelogContent = '';
  if (fs.existsSync(CHANGELOG_PATH)) {
    changelogContent = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  } else {
    console.warn(`[ReleaseNotes] Arquivo ${CHANGELOG_PATH} não encontrado.`);
  }

  // Tenta extrair a versão solicitada, se não achar cai na mais recente do CHANGELOG
  let extracted = extractVersionChangelog(changelogContent, version);
  if (!extracted) {
    console.warn(`[ReleaseNotes] Versão ${version} não encontrada no CHANGELOG.md; usando a seção mais recente do arquivo.`);
    extracted = extractVersionChangelog(changelogContent);
  }

  const date = extracted ? extracted.date : new Date().toISOString().slice(0, 10);
  const changelogBody = extracted ? extracted.body : 'Consulte o CHANGELOG.md para a lista de mudanças.';

  const options = {
    productName,
    version,
    date,
    changelogBody,
    installerFileName: `${productName} Setup ${version}.exe`,
    portableFileName: `${productName} ${version}.exe`,
    author,
    repoUrl
  };

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const markdownContent = formatReleaseNotesMarkdown(options);
  const textContent = formatReleaseNotesText(options);

  const markdownPath = path.join(outputDir, 'RELEASE_NOTES.md');
  const textPath = path.join(outputDir, 'LEIA-ME.txt');

  fs.writeFileSync(markdownPath, markdownContent, 'utf-8');
  fs.writeFileSync(textPath, textContent, 'utf-8');

  console.log(`[ReleaseNotes] ✅ Notas de versão geradas com sucesso para v${version}:`);
  console.log(`[ReleaseNotes]    📄 Markdown: ${markdownPath}`);
  console.log(`[ReleaseNotes]    📄 Texto:    ${textPath}`);

  return { markdownPath, textPath };
}

// Execução direta via CLI (node scripts/generate-release-notes.cjs)
if (require.main === module) {
  const args = process.argv.slice(2);
  let customOutputDir = null;
  let customVersion = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' || args[i] === '--output-dir' || args[i] === '-o') {
      customOutputDir = args[i + 1];
      i++;
    } else if (args[i] === '--version' || args[i] === '-v') {
      customVersion = args[i + 1];
      i++;
    }
  }

  generateReleaseNotes(customOutputDir, customVersion);
}

module.exports = {
  formatDateBr,
  normalizeVersion,
  extractVersionChangelog,
  markdownToPlainText,
  formatReleaseNotesMarkdown,
  formatReleaseNotesText,
  generateReleaseNotes
};
