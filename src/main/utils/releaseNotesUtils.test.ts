import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  extractVersionChangelog,
  formatDateBr,
  normalizeVersion,
  markdownToPlainText,
  formatReleaseNotesMarkdown,
  formatReleaseNotesText,
  generateReleaseNotesFiles
} from './releaseNotesUtils';

const SAMPLE_CHANGELOG = `# Changelog

Formato baseado em Keep a Changelog.

## [1.15.0] - 2026-09-24
### Adicionado
- **Statement Tracer (Oracle)**: captura contínua de SQL no background.
- Tools MCP: \`db_start_oracle_capture\` e \`db_stop_oracle_capture\`.

### Alterado
- Novo ícone de alta resolução com tons índigo.

### Corrigido
- Ajuste no limite de tabela para 50.000 registros.

## [1.14.0] - 2026-09-23
### Adicionado
- Criptografia em repouso AES-256-GCM.

## [1.13.0]
### Adicionado
- Suporte inicial a WinThor Start.
`;

describe('releaseNotesUtils', () => {
  describe('formatDateBr', () => {
    it('formata data ISO para DD/MM/YYYY', () => {
      expect(formatDateBr('2026-09-24')).toBe('24/09/2026');
    });

    it('retorna texto padrão quando data for vazia ou nula', () => {
      expect(formatDateBr(null)).toBe('Data não especificada');
      expect(formatDateBr(undefined)).toBe('Data não especificada');
      expect(formatDateBr('')).toBe('Data não especificada');
    });

    it('mantém o valor original se não casar com regex YYYY-MM-DD', () => {
      expect(formatDateBr('Hoje')).toBe('Hoje');
    });
  });

  describe('normalizeVersion', () => {
    it('remove prefixo v ou V', () => {
      expect(normalizeVersion('v1.15.0')).toBe('1.15.0');
      expect(normalizeVersion('V2.0.1')).toBe('2.0.1');
      expect(normalizeVersion('1.15.0')).toBe('1.15.0');
    });
  });

  describe('extractVersionChangelog', () => {
    it('extrai a versão mais recente quando targetVersion for omitida', () => {
      const result = extractVersionChangelog(SAMPLE_CHANGELOG);
      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.15.0');
      expect(result?.date).toBe('2026-09-24');
      expect(result?.body).toContain('Statement Tracer (Oracle)');
      expect(result?.body).not.toContain('Criptografia em repouso');
    });

    it('extrai versão específica solicitada com ou sem prefixo v', () => {
      const result = extractVersionChangelog(SAMPLE_CHANGELOG, '1.14.0');
      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.14.0');
      expect(result?.date).toBe('2026-09-23');
      expect(result?.body).toContain('Criptografia em repouso AES-256-GCM');
      expect(result?.body).not.toContain('Statement Tracer');

      const withV = extractVersionChangelog(SAMPLE_CHANGELOG, 'v1.14.0');
      expect(withV?.version).toBe('1.14.0');
    });

    it('suporta cabeçalho de versão sem data', () => {
      const result = extractVersionChangelog(SAMPLE_CHANGELOG, '1.13.0');
      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.13.0');
      expect(result?.date).toBeNull();
      expect(result?.body).toContain('Suporte inicial a WinThor Start');
    });

    it('retorna null se a versão especificada não existir', () => {
      expect(extractVersionChangelog(SAMPLE_CHANGELOG, '9.99.9')).toBeNull();
    });

    it('retorna null para changelog vazio ou sem blocos de versão', () => {
      expect(extractVersionChangelog('')).toBeNull();
      expect(extractVersionChangelog('# Changelog sem blocos')).toBeNull();
    });
  });

  describe('markdownToPlainText', () => {
    it('converte títulos, links, negrito e código em texto limpo', () => {
      const md = `### Adicionado\n- **Recurso X**: veja em [docs](http://exemplo.com) com \`comando\`.`;
      const plain = markdownToPlainText(md);
      expect(plain).toContain('[ADICIONADO]');
      expect(plain).toContain('Recurso X: veja em docs com comando.');
      expect(plain).not.toContain('**');
      expect(plain).not.toContain('`');
    });
  });

  describe('formatReleaseNotesMarkdown', () => {
    it('gera documento Markdown completo com tabelas, requisitos e novidades', () => {
      const md = formatReleaseNotesMarkdown({
        productName: 'Dev Manager',
        version: '1.15.0',
        date: '2026-09-24',
        changelogBody: '### Adicionado\n- Feature nova fantástica'
      });

      expect(md).toContain('# Dev Manager - v1.15.0 🚀');
      expect(md).toContain('24/09/2026');
      expect(md).toContain('Dev Manager Setup 1.15.0.exe');
      expect(md).toContain('Dev Manager 1.15.0.exe');
      expect(md).toContain('SmartScreen');
      expect(md).toContain('Feature nova fantástica');
      expect(md).toContain('Alt + 1');
      expect(md).toContain('Ctrl + K');
    });
  });

  describe('formatReleaseNotesText', () => {
    it('gera texto puro formatado com separadores ASCII e quebras CRLF', () => {
      const text = formatReleaseNotesText({
        productName: 'Dev Manager',
        version: '1.15.0',
        date: '2026-09-24',
        changelogBody: '### Adicionado\n- Feature nova fantástica'
      });

      expect(text).toContain('DEV MANAGER - NOTAS DE VERSAO E GUIA DE INSTALACAO');
      expect(text).toContain('Versao: v1.15.0');
      expect(text).toContain('Data:   24/09/2026');
      expect(text).toContain('1. QUAL ARQUIVO EXECUTAR?');
      expect(text).toContain('[RECOMENDADO]');
      expect(text).toContain('SmartScreen');
      expect(text).toContain('[ADICIONADO]');
      expect(text).toContain('Feature nova fantástica');
      // Confere quebras CRLF (\r\n) para o Bloco de Notas do Windows
      expect(text).toContain('\r\n');
    });
  });

  describe('generateReleaseNotesFiles', () => {
    it('cria os arquivos RELEASE_NOTES.md e LEIA-ME.txt no diretório alvo', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-test-'));
      try {
        const { markdownPath, textPath } = generateReleaseNotesFiles({
          outputDir: tmpDir,
          productName: 'Dev Manager',
          version: '1.15.0',
          date: '2026-09-24',
          changelogBody: '### Adicionado\n- Teste de gravação'
        });

        expect(fs.existsSync(markdownPath)).toBe(true);
        expect(fs.existsSync(textPath)).toBe(true);

        const mdContent = fs.readFileSync(markdownPath, 'utf-8');
        const txtContent = fs.readFileSync(textPath, 'utf-8');

        expect(mdContent).toContain('Dev Manager - v1.15.0');
        expect(txtContent).toContain('DEV MANAGER - NOTAS DE VERSAO');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
