import { describe, it, expect } from 'vitest';
import { parseChangelogVersions, extractChangelogByVersion } from '../utils/changelogUtils';

const SAMPLE_CHANGELOG = `# Changelog

## [1.23.0] - 2026-09-30
### Alterado
- Melhoria geral no cockpit A
- Melhoria de performance B

## [1.22.0] - 2026-09-29
### Adicionado
- Recurso de diff integrado
- Criar branch por tarefa

## [1.21.0] - 2026-09-28
### Corrigido
- Ajuste no Statement Tracer
`;

describe('WhatsNewModal data logic', () => {
  it('particiona corretamente as versões do changelog para o modal', () => {
    const versions = parseChangelogVersions(SAMPLE_CHANGELOG);
    expect(versions).toHaveLength(3);
    expect(versions[0].version).toBe('1.23.0');
    expect(versions[1].version).toBe('1.22.0');
    expect(versions[2].version).toBe('1.21.0');
  });

  it('permite extrair o conteúdo de versões anteriores para exibição isolada', () => {
    const v22 = extractChangelogByVersion(SAMPLE_CHANGELOG, '1.22.0');
    expect(v22).toContain('Recurso de diff integrado');
    expect(v22).not.toContain('Melhoria geral no cockpit A');

    const v21 = extractChangelogByVersion(SAMPLE_CHANGELOG, '1.21.0');
    expect(v21).toContain('Ajuste no Statement Tracer');
  });
});
