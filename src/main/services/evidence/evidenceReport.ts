import {
  BLOCK_KIND_LABEL,
  PHASE_LABEL,
  RESULT_LABEL,
  groupBlocks,
  summarizeEvidence,
  type EvidenceBlock,
  type EvidenceMarker,
  type EvidenceReportLayout,
  type EvidenceSession
} from '../../../shared/evidenceTypes';

const esc = (value: string | undefined): string =>
  (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const multiline = (value: string | undefined): string => esc(value).replace(/\r?\n/g, '<br>');

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
};

const CSS = `
  *{box-sizing:border-box}body{font-family:Segoe UI,Arial,sans-serif;color:#1f2937;margin:0;padding:24px;background:#fff}
  h1{margin:0 0 4px;font-size:22px}h2{font-size:16px;margin:0 0 6px}.muted{color:#6b7280;font-size:12px}
  .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 24px;margin:12px 0;font-size:13px}
  .verdict{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;color:#fff}
  .passed{background:#15803d}.failed{background:#b91c1c}.pending{background:#6b7280}
  .step{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:12px 0;page-break-inside:avoid}
  .step img{max-width:100%;border:1px solid #e5e7eb;border-radius:4px;margin-top:8px}
  .field{font-size:13px;margin:4px 0}.field b{color:#374151}
  table.summary{border-collapse:collapse;margin:8px 0;font-size:13px}table.summary td{padding:2px 14px 2px 0}
  .shot{position:relative;display:inline-block;max-width:100%}.shot img{display:block}
  .mark{position:absolute;width:30px;height:30px;transform:translate(-50%,-50%);border:3px solid #dc2626;background:rgba(220,38,38,.15);border-radius:50%}
  .blocks{margin-top:10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0;align-items:start}.pair.one{grid-template-columns:1fr}
  .block{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;min-width:0;page-break-inside:avoid}
  .block-head{display:flex;gap:8px;align-items:center;background:#f3f4f6;padding:5px 8px;font-size:12px;font-weight:600}
  .tag{background:#1f2937;color:#fff;border-radius:4px;padding:0 6px;font-size:11px}.tag.before{background:#b45309}.tag.after{background:#15803d}
  .block-meta{padding:3px 8px;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb}
  .block pre{margin:0;padding:8px;font:11px/1.45 Consolas,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
  .block pre+pre{border-top:1px dashed #d1d5db}.block .lbl{padding:4px 8px 0;font-size:10px;color:#6b7280;text-transform:uppercase}
`;

const SLIDES_CSS = `
  @page{size:A4 landscape;margin:0}body{padding:0;background:#e5e7eb}
  .slide{width:297mm;height:210mm;padding:14mm 16mm;background:#fff;page-break-after:always;break-after:page;overflow:hidden;display:flex;flex-direction:column;gap:8px;margin:0 auto}
  .slide h1{font-size:30px}.slide h2{font-size:22px}.slide .step{border:0;padding:0;margin:0}
  .slide .cols{display:grid;grid-template-columns:1fr 1.4fr;gap:16px;flex:1;min-height:0}
  .slide img{max-height:140mm;object-fit:contain}.slide .pair{grid-template-columns:1fr 1fr}.slide .block pre{font-size:10px;max-height:60mm;overflow:hidden}
  .slide.cover{justify-content:center}.slide.cover h1{font-size:38px}
  @media screen{.slide{margin:12px auto;box-shadow:0 1px 6px rgba(0,0,0,.2)}}
`;

/** Print do passo; se houve clique, desenha um anel vermelho na posição dele. */
const shot = (image: string, n: number, marker: EvidenceMarker | undefined): string => {
  const ring = marker
    ? `<span class="mark" style="left:${(marker.x * 100).toFixed(2)}%;top:${(marker.y * 100).toFixed(2)}%"></span>`
    : '';
  return `<span class="shot"><img src="${image}" alt="Print do passo ${n}">${ring}</span>`;
};

const renderBlock = (block: EvidenceBlock, phase: keyof typeof PHASE_LABEL): string => {
  const requestLabel = block.kind === 'sql' ? 'Consulta' : 'Requisição';
  const responseLabel = block.kind === 'sql' ? 'Resultado' : 'Resposta';
  const body =
    block.kind === 'text'
      ? `<pre>${esc(block.response)}</pre>`
      : `${block.request ? `<div class="lbl">${requestLabel}</div><pre>${esc(block.request)}</pre>` : ''}${block.response ? `<div class="lbl">${responseLabel}</div><pre>${esc(block.response)}</pre>` : ''}`;
  return `<div class="block"><div class="block-head"><span class="tag ${phase}">${esc(PHASE_LABEL[phase])}</span><span class="tag">${BLOCK_KIND_LABEL[block.kind]}</span>${esc(block.title)}</div>${block.meta ? `<div class="block-meta">${esc(block.meta)}</div>` : ''}${body}</div>`;
};

const renderBlocks = (blocks: EvidenceSession['steps'][number]['blocks']): string => {
  const rows = groupBlocks(blocks);
  if (rows.length === 0) return '';
  const html = rows
    .map((row) => {
      const cells = [row.before && renderBlock(row.before, 'before'), row.after && renderBlock(row.after, 'after'), row.single && renderBlock(row.single, 'single')].filter(Boolean);
      return `<div class="pair${cells.length === 1 ? ' one' : ''}">${cells.join('')}</div>`;
    })
    .join('');
  return `<div class="blocks">${html}</div>`;
};

/** Relatório HTML autocontido (imagens embutidas): dá para abrir, imprimir em PDF ou anexar como está. */
export function buildEvidenceHtml(session: EvidenceSession, images: ReadonlyMap<string, string>, layout: EvidenceReportLayout = 'document'): string {
  if (layout === 'slides') return buildSlidesHtml(session, images);
  const summary = summarizeEvidence(session.steps);
  const kind = session.kind === 'qa' ? 'Evidência de teste' : 'Evidência de desenvolvimento';

  const steps = session.steps
    .map((step, i) => {
      const image = step.screenshot ? images.get(step.screenshot) : undefined;
      return `<section class="step">
  <h2>${i + 1}. ${esc(step.title) || 'Passo sem título'} <span class="verdict ${step.result}">${RESULT_LABEL[step.result]}</span></h2>
  <div class="muted">${esc(formatDate(step.createdAt))}</div>
  ${step.expected ? `<div class="field"><b>Esperado:</b> ${multiline(step.expected)}</div>` : ''}
  ${step.actual ? `<div class="field"><b>Obtido:</b> ${multiline(step.actual)}</div>` : ''}
  ${image ? shot(image, i + 1, step.marker) : ''}
  ${renderBlocks(step.blocks)}
</section>`;
    })
    .join('\n');

  const videos = session.videos.length
    ? `<h2>Gravações</h2><ul>${session.videos.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>`
    : '';

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(session.task)} - ${esc(kind)}</title><style>${CSS}</style></head>
<body>
<h1>${esc(session.title || session.task)}</h1>
<div class="muted">${esc(kind)} · gerado pelo Hub Manager em ${esc(formatDate(new Date().toISOString()))}</div>
<div class="meta">
  <div><b>Tarefa:</b> ${esc(session.task)}</div>
  <div><b>Resultado:</b> <span class="verdict ${summary.verdict}">${RESULT_LABEL[summary.verdict]}</span></div>
  <div><b>Responsável:</b> ${esc(session.tester) || '-'}</div>
  <div><b>Início:</b> ${esc(formatDate(session.createdAt))}</div>
  <div style="grid-column:1/-1"><b>Ambiente:</b> ${multiline(session.environment) || '-'}</div>
</div>
<table class="summary"><tr><td>Passos: <b>${summary.total}</b></td><td>Aprovados: <b>${summary.passed}</b></td><td>Reprovados: <b>${summary.failed}</b></td><td>Pendentes: <b>${summary.pending}</b></td></tr></table>
${steps || '<p class="muted">Nenhum passo registrado.</p>'}
${videos}
</body></html>`;
}

/** Apresentação: capa, um slide por passo (print + provas) e fechamento. Em PDF sai paisagem, uma página por slide. */
function buildSlidesHtml(session: EvidenceSession, images: ReadonlyMap<string, string>): string {
  const summary = summarizeEvidence(session.steps);
  const kind = session.kind === 'qa' ? 'Evidência de teste' : 'Evidência de desenvolvimento';
  const cover = `<section class="slide cover">
  <div class="muted">${esc(kind)}</div>
  <h1>${esc(session.title || session.task)}</h1>
  <div class="meta"><div><b>Tarefa:</b> ${esc(session.task)}</div><div><b>Resultado:</b> <span class="verdict ${summary.verdict}">${RESULT_LABEL[summary.verdict]}</span></div>
  <div><b>Responsável:</b> ${esc(session.tester) || '-'}</div><div><b>Data:</b> ${esc(formatDate(session.createdAt))}</div>
  <div style="grid-column:1/-1"><b>Ambiente:</b> ${multiline(session.environment) || '-'}</div></div>
</section>`;

  const slides = session.steps
    .map((step, i) => {
      const image = step.screenshot ? images.get(step.screenshot) : undefined;
      const text = `${step.expected ? `<div class="field"><b>Esperado:</b> ${multiline(step.expected)}</div>` : ''}${step.actual ? `<div class="field"><b>Obtido:</b> ${multiline(step.actual)}</div>` : ''}`;
      const blocks = renderBlocks(step.blocks);
      const visual = image ? shot(image, i + 1, step.marker) : blocks;
      return `<section class="slide step">
  <h2>${i + 1}. ${esc(step.title) || 'Passo sem título'} <span class="verdict ${step.result}">${RESULT_LABEL[step.result]}</span></h2>
  <div class="cols"><div>${text}${image ? blocks : ''}</div><div>${visual}</div></div>
</section>`;
    })
    .join('\n');

  const closing = `<section class="slide cover">
  <h1>Resumo</h1>
  <table class="summary"><tr><td>Passos: <b>${summary.total}</b></td><td>Aprovados: <b>${summary.passed}</b></td><td>Reprovados: <b>${summary.failed}</b></td><td>Pendentes: <b>${summary.pending}</b></td></tr></table>
  <p><span class="verdict ${summary.verdict}">${RESULT_LABEL[summary.verdict]}</span></p>
  ${session.videos.length ? `<p class="muted">Gravações: ${session.videos.map(esc).join(', ')}</p>` : ''}
</section>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(session.task)} - apresentação</title><style>${CSS}${SLIDES_CSS}</style></head>
<body>
${cover}
${slides}
${closing}
</body></html>`;
}

const JIRA_BLOCK_MAX_CHARS = 1500;

/** Bloco {code} do Jira, cortado para o comentário não ficar gigante (o relatório anexo tem o conteúdo completo). */
const jiraCode = (label: string, content: string | undefined): string[] => {
  const body = content?.trim();
  if (!body) return [];
  const cut = body.length > JIRA_BLOCK_MAX_CHARS ? `${body.slice(0, JIRA_BLOCK_MAX_CHARS)}\n… (continua no relatório anexo)` : body;
  return [`_${label}_`, `{code}`, cut.replace(/\{code\}/g, '{ code }'), '{code}'];
};

/** Comentário em wiki markup do Jira Server (REST v2), com o resumo e a lista do que foi anexado. */
export function buildJiraComment(session: EvidenceSession, attached: readonly string[]): string {
  const summary = summarizeEvidence(session.steps);
  const kind = session.kind === 'qa' ? 'Evidência de teste' : 'Evidência de desenvolvimento';
  const clean = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();
  const lines = [
    `*${kind}* - ${clean(session.title || session.task)}`,
    `Resultado: *${RESULT_LABEL[summary.verdict]}* (${summary.passed} aprovados, ${summary.failed} reprovados, ${summary.pending} pendentes de ${summary.total} passos)`
  ];
  if (session.environment) lines.push(`Ambiente: ${clean(session.environment)}`);
  session.steps.forEach((step, i) => {
    lines.push(`# ${clean(step.title) || `Passo ${i + 1}`} - ${RESULT_LABEL[step.result]}`);
  });
  const withBlocks = session.steps.filter((s) => s.blocks?.length);
  if (withBlocks.length) {
    lines.push('', 'h4. Provas');
    for (const step of withBlocks) {
      lines.push(`*${clean(step.title)}*`);
      for (const block of step.blocks ?? []) {
        const head = [PHASE_LABEL[block.phase], BLOCK_KIND_LABEL[block.kind], block.title && clean(block.title), block.meta && clean(block.meta)].filter(Boolean).join(' - ');
        lines.push(`_${head}_`);
        if (block.kind === 'text') lines.push(...jiraCode('Conteúdo', block.response));
        else lines.push(...jiraCode(block.kind === 'sql' ? 'Consulta' : 'Requisição', block.request), ...jiraCode(block.kind === 'sql' ? 'Resultado' : 'Resposta', block.response));
      }
    }
  }
  if (attached.length) lines.push('', `Anexos: ${attached.map((a) => `[^${a}]`).join(', ')}`);
  return lines.join('\n');
}
