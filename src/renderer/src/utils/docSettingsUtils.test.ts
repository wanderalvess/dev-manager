import { describe, it, expect } from 'vitest';
import {
  getFolderDisplayTitle,
  buildConfluenceSource,
  buildJiraSource
} from './docSettingsUtils';

describe('getFolderDisplayTitle', () => {
  it('usa o label quando presente', () => {
    expect(getFolderDisplayTitle({ path: 'C:\\a\\b', label: '  Manuais ' } as any)).toBe('Manuais');
  });
  it('usa os dois últimos segmentos do caminho', () => {
    expect(getFolderDisplayTitle({ path: 'C:\\docs\\erp\\' } as any)).toBe('docs / erp');
  });
  it('cai para o caminho quando há um só segmento vazio', () => {
    expect(getFolderDisplayTitle({ path: '/' } as any)).toBe('/');
  });
});

describe('buildConfluenceSource / buildJiraSource', () => {
  it('retorna null sem campos obrigatórios', () => {
    expect(buildConfluenceSource({ name: 'x' })).toBeNull();
    expect(buildJiraSource(null)).toBeNull();
  });
  it('normaliza e aplica defaults', () => {
    const c = buildConfluenceSource({ name: ' W ', baseUrl: ' u ', authToken: ' t ', spaceKey: ' ' });
    expect(c).toMatchObject({ name: 'W', baseUrl: 'u', authToken: 't', spaceKey: undefined, enabled: true });
    expect(c!.id).toMatch(/^confluence_/);
    const j = buildJiraSource({ id: 'j1', name: 'J', baseUrl: 'u', authToken: 't', jql: ' q ', enabled: false });
    expect(j).toMatchObject({ id: 'j1', jql: 'q', enabled: false });
  });
});
