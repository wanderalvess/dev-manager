import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConsoleBody } from './ConsoleBody';

describe('ConsoleBody', () => {
  it('mostra o estado vazio quando não há texto', () => {
    const html = renderToStaticMarkup(<ConsoleBody text="" empty={<span>sem saída</span>} />);
    expect(html).toContain('sem saída');
  });

  it('mostra o estado vazio quando a lista de linhas está vazia', () => {
    const html = renderToStaticMarkup(<ConsoleBody lines={[]} empty={<span>nada aqui</span>} />);
    expect(html).toContain('nada aqui');
  });

  it('renderiza o texto único sem o estado vazio', () => {
    const html = renderToStaticMarkup(<ConsoleBody text={'linha 1\nlinha 2'} empty={<span>sem saída</span>} />);
    expect(html).toContain('linha 1');
    expect(html).not.toContain('sem saída');
  });

  it('renderiza cada linha com a classe de getLineClass', () => {
    const html = renderToStaticMarkup(
      <ConsoleBody
        lines={['ok', '[ERRO] falhou']}
        getLineClass={(line) => (line.includes('[ERRO]') ? 'text-rose-400' : 'text-foreground')}
      />
    );
    expect(html).toContain('text-foreground');
    expect(html).toMatch(/text-rose-400[^>]*>\[ERRO\] falhou/);
  });

  it('aplica a classe do contêiner rolável', () => {
    const html = renderToStaticMarkup(<ConsoleBody text="x" className="p-3 bg-black" />);
    expect(html).toContain('p-3 bg-black');
    expect(html).toContain('overflow-y-auto');
  });
});
