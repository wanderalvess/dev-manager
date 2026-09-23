import { describe, it, expect } from 'vitest';
import { extractLatestChangelogSection, extractChangelogVersion } from './changelogUtils';

const SAMPLE = `# Changelog

Formato baseado em Keep a Changelog.

## [1.14.0] - 2026-09-23
### Adicionado
- Item novo A
- Item novo B

## [1.13.0] - 2026-09-21
### Adicionado
- Item antigo
`;

describe('extractLatestChangelogSection', () => {
  it('retorna apenas o bloco da versão mais recente, sem as versões anteriores', () => {
    const section = extractLatestChangelogSection(SAMPLE);
    expect(section).toContain('## [1.14.0] - 2026-09-23');
    expect(section).toContain('Item novo A');
    expect(section).not.toContain('Item antigo');
    expect(section).not.toContain('[1.13.0]');
  });

  it('retorna null quando não há cabeçalho de versão', () => {
    expect(extractLatestChangelogSection('# Changelog\n\nsem versões aqui')).toBeNull();
  });

  it('retorna null para conteúdo vazio ou nulo', () => {
    expect(extractLatestChangelogSection('')).toBeNull();
    expect(extractLatestChangelogSection(null)).toBeNull();
    expect(extractLatestChangelogSection(undefined)).toBeNull();
  });
});

describe('extractChangelogVersion', () => {
  it('extrai o número da versão do cabeçalho', () => {
    expect(extractChangelogVersion('## [1.14.0] - 2026-09-23\n### Adicionado')).toBe('1.14.0');
  });

  it('retorna null quando a seção é null ou não tem cabeçalho reconhecível', () => {
    expect(extractChangelogVersion(null)).toBeNull();
    expect(extractChangelogVersion('sem cabeçalho aqui')).toBeNull();
  });
});
