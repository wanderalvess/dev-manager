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
