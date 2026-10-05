import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks } from './markdownReaderParser';

describe('parseMarkdownBlocks', () => {
  it('retorna lista vazia para conteúdo vazio', () => {
    expect(parseMarkdownBlocks('')).toEqual([]);
  });

  it('reconhece bloco de código com linguagem e contagem de linhas', () => {
    const [block] = parseMarkdownBlocks('```TS\nconst a = 1;\nconst b = 2;\n```');
    expect(block).toMatchObject({ kind: 'code', language: 'ts', lineCount: 2, codeIndex: 0 });
  });

  it('usa "code" como linguagem padrão e indexa blocos em sequência', () => {
    const blocks = parseMarkdownBlocks('```\na\n```\n\n```js\nb\n```');
    expect(blocks.map((b) => (b.kind === 'code' ? [b.language, b.codeIndex] : null))).toEqual([
      ['code', 0],
      ['js', 1]
    ]);
  });

  it('gera id de título com índice da linha e marca o primeiro bloco', () => {
    const blocks = parseMarkdownBlocks('# Olá Mundo\n\n## Segunda');
    expect(blocks[0]).toMatchObject({ kind: 'heading', level: 1, id: 'heading-0-ol-mundo', isFirst: true });
    expect(blocks[1]).toMatchObject({ kind: 'heading', level: 2, isFirst: false });
  });

  it('distingue callout, citação e prompt', () => {
    const blocks = parseMarkdownBlocks('> [!WARNING] Cuidado\n> linha\n\n> "prompt"\n\n> texto');
    expect(blocks[0]).toMatchObject({ kind: 'callout', type: 'WARNING', lines: ['Cuidado', 'linha'] });
    expect(blocks[1]).toMatchObject({ kind: 'quote', isPrompt: true });
    expect(blocks[2]).toMatchObject({ kind: 'quote', isPrompt: false });
  });

  it('interpreta tabelas', () => {
    const [block] = parseMarkdownBlocks('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |');
    expect(block).toMatchObject({ kind: 'table', header: ['A', 'B'], rows: [['1', '2'], ['3', '4']] });
  });

  it('interpreta listas com tarefas e itens ordenados', () => {
    const [block] = parseMarkdownBlocks('- [x] feito\n- [ ] pendente\n1. um');
    expect(block).toMatchObject({
      kind: 'list',
      items: [
        { text: 'feito', isTask: true, checked: true, isOrdered: false },
        { text: 'pendente', isTask: true, checked: false, isOrdered: false },
        { text: 'um', isTask: false, isOrdered: true }
      ]
    });
  });

  it('reconhece divisória e parágrafo', () => {
    const blocks = parseMarkdownBlocks('texto\n---');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'hr']);
  });
});
