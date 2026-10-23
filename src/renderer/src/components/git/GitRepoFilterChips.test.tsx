import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GitRepoFilterChips } from './GitRepoFilterChips';
import { GitPrSteps } from './GitPrSteps';
import { getPrSteps } from '../../utils/gitPublishViewUtils';

describe('GitRepoFilterChips', () => {
  it('mostra os quatro filtros com contagem e marca só o ativo', () => {
    const html = renderToStaticMarkup(
      <GitRepoFilterChips
        filter="local-only"
        counts={{ all: 39, changes: 3, 'local-only': 2, unpushed: 1 }}
        onChange={vi.fn()}
      />
    );
    for (const label of ['Todos', 'Com alterações', 'Só locais', 'Sem push']) expect(html).toContain(label);
    expect(html).toContain('39');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(3);
  });
});

describe('GitPrSteps', () => {
  it('destaca a publicação pendente de uma branch só local', () => {
    const html = renderToStaticMarkup(
      <GitPrSteps steps={getPrSteps({ branch: 'bugfix/x', localOnly: true, unpushedCommits: 0, blockedReason: null })} />
    );
    expect(html).toContain('Publicar no origin');
    expect(html).toContain('a branch só existe neste computador');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('o botão publica antes de abrir');
  });

  it('mostra o motivo quando o PR está bloqueado', () => {
    const html = renderToStaticMarkup(
      <GitPrSteps steps={getPrSteps({ branch: 'a1b2c3d4', localOnly: false, unpushedCommits: 0, blockedReason: 'HEAD destacado' })} />
    );
    expect(html).toContain('HEAD destacado');
    expect(html).not.toContain('aria-current');
  });
});
