import { describe, it, expect } from 'vitest';
import { filterWhatsNewVersions, resolveWhatsNewDefaultVersion } from './whatsNewModalUtils';
import type { ChangelogVersion } from './changelogUtils';

const makeVersion = (version: string, date?: string): ChangelogVersion => ({
  version,
  date,
  title: version,
  content: '',
  rawHeader: ''
});

const versions = [makeVersion('1.2.0', '2026-03-01'), makeVersion('1.1.0', '2026-02-01')];

describe('resolveWhatsNewDefaultVersion', () => {
  it('prioriza a versão inicial', () => {
    expect(resolveWhatsNewDefaultVersion(versions, '9.9.9', '1.1.0')).toBe('9.9.9');
  });

  it('usa a versão do app ignorando prefixo v e caixa', () => {
    expect(resolveWhatsNewDefaultVersion(versions, undefined, 'v1.1.0')).toBe('1.1.0');
  });

  it('cai para a mais recente ou "all" quando vazio', () => {
    expect(resolveWhatsNewDefaultVersion(versions, undefined, '0.0.1')).toBe('1.2.0');
    expect(resolveWhatsNewDefaultVersion([])).toBe('all');
  });
});

describe('filterWhatsNewVersions', () => {
  it('retorna tudo sem busca e filtra por versão ou data', () => {
    expect(filterWhatsNewVersions(versions, '  ')).toBe(versions);
    expect(filterWhatsNewVersions(versions, '1.1')).toHaveLength(1);
    expect(filterWhatsNewVersions(versions, '2026-03')).toHaveLength(1);
  });
});
