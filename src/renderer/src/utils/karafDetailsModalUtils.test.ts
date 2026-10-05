import { describe, expect, it } from 'vitest';
import { getDetailsTabClass } from './karafDetailsModalUtils';

describe('getDetailsTabClass', () => {
  it('aba ativa comum usa a cor primary', () => {
    expect(getDetailsTabClass('exports', 'exports')).toContain('border-primary text-primary font-bold');
  });

  it('aba inativa comum usa estilo muted', () => {
    const cls = getDetailsTabClass('imports', 'exports');
    expect(cls).toContain('border-transparent text-muted-foreground');
    expect(cls).not.toContain('border-primary');
  });

  it('aba tree inclui layout flex para o ícone', () => {
    expect(getDetailsTabClass('tree', 'dependents')).toContain('flex items-center gap-1.5');
    expect(getDetailsTabClass('exports', 'dependents')).not.toContain('flex items-center');
  });

  it('aba diag usa a paleta rose', () => {
    expect(getDetailsTabClass('diag', 'diag')).toContain('border-rose-500 text-rose-500 font-bold');
    expect(getDetailsTabClass('diag', 'tree')).toContain('text-rose-400 hover:text-rose-300');
  });
});
