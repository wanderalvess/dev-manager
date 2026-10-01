import { describe, it, expect } from 'vitest';
import {
  extractLatestChangelogSection,
  extractChangelogVersion,
  parseChangelogVersions,
  extractChangelogByVersion
} from './changelogUtils';

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

describe('parseChangelogVersions', () => {
  it('extrai e particiona todas as versões com datas e conteúdos isolados', () => {
    const versions = parseChangelogVersions(SAMPLE);
    expect(versions).toHaveLength(2);

    expect(versions[0].version).toBe('1.14.0');
    expect(versions[0].date).toBe('2026-09-23');
    expect(versions[0].content).toContain('Item novo A');
    expect(versions[0].content).not.toContain('Item antigo');

    expect(versions[1].version).toBe('1.13.0');
    expect(versions[1].date).toBe('2026-09-21');
    expect(versions[1].content).toContain('Item antigo');
    expect(versions[1].content).not.toContain('Item novo A');
  });

  it('retorna array vazio quando não há versões ou o conteúdo é vazio', () => {
    expect(parseChangelogVersions('')).toEqual([]);
    expect(parseChangelogVersions(null)).toEqual([]);
    expect(parseChangelogVersions('Sem versões')).toEqual([]);
  });

  it('lida corretamente com versões sem data explicitada', () => {
    const raw = `## [1.0.0]\n### Inicial\n- Primeiro release`;
    const res = parseChangelogVersions(raw);
    expect(res).toHaveLength(1);
    expect(res[0].version).toBe('1.0.0');
    expect(res[0].date).toBeUndefined();
    expect(res[0].content).toContain('Primeiro release');
  });
});

describe('extractChangelogByVersion', () => {
  it('localiza e retorna o conteúdo da versão solicitada (com ou sem prefixo "v")', () => {
    const v13 = extractChangelogByVersion(SAMPLE, '1.13.0');
    expect(v13).toContain('Item antigo');
    expect(v13).not.toContain('Item novo A');

    const v14 = extractChangelogByVersion(SAMPLE, 'v1.14.0');
    expect(v14).toContain('Item novo A');
  });

  it('retorna null quando a versão solicitada não existe', () => {
    expect(extractChangelogByVersion(SAMPLE, '9.9.9')).toBeNull();
  });
});

