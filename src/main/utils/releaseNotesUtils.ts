import fs from 'node:fs';
import path from 'node:path';

export interface ExtractedChangelog {
  version: string;
  date: string | null;
  body: string;
  rawHeader: string;
}

export interface ReleaseNotesOptions {
  productName?: string;
  version?: string;
  date?: string | null;
  changelogBody?: string;
  installerFileName?: string;
  portableFileName?: string;
  repoUrl?: string;
  author?: string;
}

export interface GenerateFilesOptions extends ReleaseNotesOptions {
  outputDir: string;
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato legível brasileiro (DD/MM/YYYY).
 */
export function formatDateBr(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Data não especificada';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Normaliza número de versão removendo prefixo 'v' (ex: "v1.15.0" -> "1.15.0").
 */
export function normalizeVersion(ver: string): string {
  return ver.trim().replace(/^v/i, '');
}

/**
 * Extrai do conteúdo do CHANGELOG.md o bloco referente a uma versão específica
 * ou à versão mais recente (se targetVersion for omitida).
 */
export function extractVersionChangelog(
  changelogContent: string | null | undefined,
  targetVersion?: string
): ExtractedChangelog | null {
  if (!changelogContent) return null;

  const lines = changelogContent.split(/\r?\n/);
  const versionRegex = /^##\s*\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/;

  const headers: Array<{ lineIndex: number; version: string; date: string | null; raw: string }> = [];

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

/**
 * Converte trecho de markdown do changelog em texto puro limpo
 * para leitura agradável em editores simples como o Bloco de Notas (Notepad).
 */
export function markdownToPlainText(md: string): string {
  if (!md) return '';

  return md
    // Subcabeçalhos (### Adicionado -> [ADICIONADO])
    .replace(/^###\s*(.+)$/gm, (_match, title) => `\n[${title.trim().toUpperCase()}]`)
    .replace(/^##\s*(.+)$/gm, (_match, title) => `\n=== ${title.trim().toUpperCase()} ===`)
    // Remove links markdown mantendo texto e url: [texto](url) -> texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove negrito e itálico: **texto** ou __texto__ -> texto
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove código inline `código` -> código
    .replace(/`([^`]+)`/g, '$1')
    // Ajusta quebras múltiplas
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Gera as notas de versão formatadas em Markdown (RELEASE_NOTES.md).
 */
export function formatReleaseNotesMarkdown(options: ReleaseNotesOptions): string {
  const productName = options.productName || 'Hub Manager';
  const version = options.version || '1.0.0';
  const dateFormatted = formatDateBr(options.date);
  const installerFile = options.installerFileName || `${productName} Setup ${version}.exe`;
  const portableFile = options.portableFileName || `${productName} ${version}.exe`;
  const changelogBody = options.changelogBody || 'Consulte o arquivo CHANGELOG.md para a lista detalhada de alterações.';
  const author = options.author || 'Wanderson Alves';
  const repoUrl = options.repoUrl || 'https://github.com/wanderalvess/dev-manager';

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

/**
 * Gera as notas de versão formatadas em texto puro (LEIA-ME.txt),
 * compatível com o Bloco de Notas do Windows (Notepad) com quebras CRLF.
 */
export function formatReleaseNotesText(options: ReleaseNotesOptions): string {
  const productName = options.productName || 'Hub Manager';
  const version = options.version || '1.0.0';
  const dateFormatted = formatDateBr(options.date);
  const installerFile = options.installerFileName || `${productName} Setup ${version}.exe`;
  const portableFile = options.portableFileName || `${productName} ${version}.exe`;
  const rawChangelog = options.changelogBody || 'Consulte o arquivo CHANGELOG.md para a lista detalhada de alteracoes.';
  const author = options.author || 'Wanderson Alves';
  const repoUrl = options.repoUrl || 'https://github.com/wanderalvess/dev-manager';

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

  // Garante quebra de linha CRLF (\r\n) para o Bloco de Notas do Windows
  return lines.join('\r\n');
}

/**
 * Grava os arquivos de notas de versão (RELEASE_NOTES.md e LEIA-ME.txt)
 * no diretório de saída informado.
 */
export function generateReleaseNotesFiles(options: GenerateFilesOptions): {
  markdownPath: string;
  textPath: string;
} {
  const { outputDir } = options;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const markdownContent = formatReleaseNotesMarkdown(options);
  const textContent = formatReleaseNotesText(options);

  const markdownPath = path.join(outputDir, 'RELEASE_NOTES.md');
  const textPath = path.join(outputDir, 'LEIA-ME.txt');

  fs.writeFileSync(markdownPath, markdownContent, 'utf-8');
  fs.writeFileSync(textPath, textContent, 'utf-8');

  return { markdownPath, textPath };
}
