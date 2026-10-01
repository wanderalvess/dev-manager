/**
 * Completa a pasta do release (release/) com o que o usuário precisa além do instalador:
 * LEIA-ME.txt, instalar-extras.cmd e o servidor MCP autossuficiente (mcp/).
 *
 * Roda automaticamente ao fim do `npm run build:electron`; também pode ser chamado
 * sozinho com `npm run release:folder`. Arquivos colocados à mão na pasta (Instant
 * Client, modelo do RAG) não são tocados.
 */
const fs = require('fs');
const path = require('path');
const { buildMcp } = require('./build-mcp.cjs');
const { generateReleaseNotes } = require('./generate-release-notes.cjs');

const repoRoot = path.resolve(__dirname, '..');
const templatesDir = path.join(__dirname, 'release-templates');

function toCrlf(content) {
  return content.replace(/\r?\n/g, '\r\n');
}

async function prepareRelease(releaseDir = path.join(repoRoot, 'release')) {
  const version = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')).version;
  fs.mkdirSync(releaseDir, { recursive: true });

  // 1. Gera o RELEASE_NOTES.md (Markdown para GitHub Releases / docs)
  try {
    generateReleaseNotes(releaseDir, version);
  } catch (err) {
    console.warn('[Release] Aviso ao gerar RELEASE_NOTES.md:', err.message);
  }

  // 2. Garante o LEIA-ME.txt oficial com guia do MCP e downloads opcionais
  const readme = fs.readFileSync(path.join(templatesDir, 'LEIA-ME.txt'), 'utf-8').replaceAll('{{VERSION}}', version);
  // BOM: o Bloco de Notas de versões antigas do Windows só reconhece UTF-8 (acentos) com ele.
  fs.writeFileSync(path.join(releaseDir, 'LEIA-ME.txt'), '﻿' + toCrlf(readme), 'utf-8');

  // 3. .cmd precisa de CRLF: com LF o cmd.exe erra saltos para labels (goto/call :label).
  const extras = fs.readFileSync(path.join(templatesDir, 'instalar-extras.cmd'), 'utf-8');
  fs.writeFileSync(path.join(releaseDir, 'instalar-extras.cmd'), toCrlf(extras), 'utf-8');

  // 4. Servidor MCP
  await buildMcp(path.join(releaseDir, 'mcp'));
  console.log(`[Release] RELEASE_NOTES.md, LEIA-ME.txt, instalar-extras.cmd e mcp/ gerados em ${releaseDir}`);
}

module.exports = { prepareRelease };

if (require.main === module) {
  prepareRelease(process.argv[2] ? path.resolve(process.argv[2]) : undefined).catch((err) => {
    console.error('[Release] Falha ao preparar a pasta do release:', err);
    process.exit(1);
  });
}
