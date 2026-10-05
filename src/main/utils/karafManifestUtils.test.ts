import { describe, expect, it } from 'vitest';
import { parseCapabilitiesWiredBundles, parseClauseList, parseManifestHeaders } from './karafManifestUtils';

describe('karafManifestUtils', () => {
  it('parseClauseList respeita aspas e colchetes', () => {
    expect(parseClauseList('a;version="[1,2)",b,c')).toEqual(['a;version="[1,2)"', 'b', 'c']);
    expect(parseClauseList(undefined)).toEqual([]);
  });

  it('parseManifestHeaders junta linhas de continuacao', () => {
    const headers = parseManifestHeaders('Bundle-Name = Core\nExport-Package = a,\n  b');
    expect(headers['Bundle-Name']).toBe('Core');
    expect(headers['Export-Package']).toBe('a, b');
    expect(parseManifestHeaders('')).toEqual({});
  });

  it('parseCapabilitiesWiredBundles extrai dependentes sem duplicar', () => {
    const out = ['osgi.wiring.package; pkg=x', '  Wired to:', '    [12] Foo (1.0.0)', '    [12] Foo (1.0.0)'].join('\n');
    expect(parseCapabilitiesWiredBundles(out)).toEqual([
      { id: '12', name: 'Foo', version: '1.0.0', reason: 'osgi.wiring.package' }
    ]);
  });
});
