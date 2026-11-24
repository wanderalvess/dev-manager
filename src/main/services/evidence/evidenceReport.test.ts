import { describe, expect, it } from 'vitest';
import type { EvidenceSession } from '../../../shared/evidenceTypes';
import { buildEvidenceHtml, buildJiraComment } from './evidenceReport';

const makeSession = (overrides: Partial<EvidenceSession> = {}): EvidenceSession => ({
  id: 'WT-1__20260101-100000',
  task: 'WT-1',
  title: 'Teste <b>x</b>',
  kind: 'qa',
  steps: [
    { id: 's1', title: 'Abrir tela', result: 'passed', screenshot: 'step-01.png', createdAt: '2026-01-01T10:00:00.000Z' },
    { id: 's2', title: 'Salvar', expected: 'ok', actual: 'erro\nORA-1', result: 'failed', createdAt: '2026-01-01T10:01:00.000Z' }
  ],
  videos: ['video-01.webm'],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:02:00.000Z',
  ...overrides
});

const withBlocks = (): EvidenceSession =>
  makeSession({
    steps: [
      {
        id: 's1',
        title: 'Consulta <pedido>',
        result: 'passed',
        createdAt: '2026-01-01T10:00:00.000Z',
        blocks: [
          { id: 'b1', kind: 'sql', phase: 'before', request: 'select status from t', response: 'STATUS\n------\nA', meta: '1 linha(s)', createdAt: '2026-01-01T10:00:00.000Z' },
          { id: 'b2', kind: 'sql', phase: 'after', request: 'select status from t', response: 'STATUS\n------\nB', meta: '1 linha(s)', createdAt: '2026-01-01T10:01:00.000Z' }
        ]
      }
    ]
  });

describe('provas em texto (API/SQL)', () => {
  it('mostra antes e depois lado a lado no relatório', () => {
    const html = buildEvidenceHtml(withBlocks(), new Map());
    expect(html).toContain('class="pair"');
    expect(html.indexOf('tag before')).toBeLessThan(html.indexOf('tag after'));
    expect(html).toContain('select status from t');
  });

  it('gera slides paisagem com capa, um slide por passo e fechamento', () => {
    const html = buildEvidenceHtml(withBlocks(), new Map(), 'slides');
    expect(html).toContain('@page{size:A4 landscape');
    expect(html.match(/class="slide/g)).toHaveLength(3);
    expect(html).toContain('Consulta &lt;pedido&gt;');
  });

  it('desenha o anel do clique sobre o print', () => {
    const session = makeSession({ steps: [{ id: 's1', title: 'Clicar', result: 'pending', screenshot: 'a.png', marker: { x: 0.25, y: 0.5 }, createdAt: '2026-01-01T10:00:00.000Z' }] });
    const html = buildEvidenceHtml(session, new Map([['a.png', 'data:image/png;base64,AAA']]));
    expect(html).toContain('class="mark" style="left:25.00%;top:50.00%"');
  });

  it('inclui as provas no comentário do Jira em bloco code', () => {
    const comment = buildJiraComment(withBlocks(), []);
    expect(comment).toContain('h4. Provas');
    expect(comment).toContain('{code}\nselect status from t\n{code}');
  });
});

describe('buildEvidenceHtml', () => {
  it('escapa texto, embute a imagem e mostra o veredito', () => {
    const html = buildEvidenceHtml(makeSession(), new Map([['step-01.png', 'data:image/png;base64,AAA']]));
    expect(html).toContain('Teste &lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('src="data:image/png;base64,AAA"');
    expect(html).toContain('Reprovado');
    expect(html).toContain('erro<br>ORA-1');
    expect(html).toContain('video-01.webm');
  });

  it('avisa quando não há passos', () => {
    expect(buildEvidenceHtml(makeSession({ steps: [], videos: [] }), new Map())).toContain('Nenhum passo registrado');
  });
});

describe('buildJiraComment', () => {
  it('resume o resultado e lista os anexos', () => {
    const text = buildJiraComment(makeSession(), ['relatorio.pdf']);
    expect(text).toContain('Resultado: *Reprovado*');
    expect(text).toContain('# Salvar - Reprovado');
    expect(text).toContain('[^relatorio.pdf]');
  });
});

describe('links da evidência', () => {
  const links: EvidenceSession['links'] = [
    { id: 'l1', kind: 'pr', label: 'Versão 1.2 [rc|1]', url: 'https://github.com/o/r/pull/7' },
    { id: 'l2', kind: 'video', url: 'https://videos.example.com/a?b=1&c=2' },
    { id: 'l3', kind: 'other', label: 'Malicioso', url: 'javascript:alert(1)' }
  ];

  it('relatório lista os links, escapa o HTML e descarta o que não é http(s)', () => {
    const html = buildEvidenceHtml(makeSession({ links }), new Map());
    expect(html).toContain('<a href="https://github.com/o/r/pull/7" rel="noopener noreferrer">');
    expect(html).toContain('Pull request: Versão 1.2 [rc|1]');
    expect(html).toContain('href="https://videos.example.com/a?b=1&amp;c=2"');
    expect(html).not.toContain('javascript:');
    expect(buildEvidenceHtml(makeSession({ links }), new Map(), 'slides')).toContain('Pull request');
    expect(buildEvidenceHtml(makeSession(), new Map())).not.toContain('<b>Links:</b>');
  });

  it('comentário do Jira usa [rótulo|url] sem deixar colchetes quebrarem a marcação', () => {
    const text = buildJiraComment(makeSession({ links }), []);
    expect(text).toContain('Links:\n* Pull request: [Versão 1.2 rc 1|https://github.com/o/r/pull/7]\n* Vídeo: [https://videos.example.com/a?b=1&c=2]');
    expect(text).not.toContain('javascript:');
    expect(text.indexOf('* Vídeo')).toBeLessThan(text.indexOf('# Abrir tela'));
  });
});
