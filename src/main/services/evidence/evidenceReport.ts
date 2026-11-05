import { RESULT_LABEL, summarizeEvidence, type EvidenceSession } from '../../../shared/evidenceTypes';

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
`;

/** Relatório HTML autocontido (imagens embutidas): dá para abrir, imprimir em PDF ou anexar como está. */
export function buildEvidenceHtml(session: EvidenceSession, images: ReadonlyMap<string, string>): string {
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
  ${image ? `<img src="${image}" alt="Print do passo ${i + 1}">` : ''}
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
  session.steps.forEach((step, i) => lines.push(`# ${clean(step.title) || `Passo ${i + 1}`} - ${RESULT_LABEL[step.result]}`));
  if (attached.length) lines.push('', `Anexos: ${attached.map((a) => `[^${a}]`).join(', ')}`);
  return lines.join('\n');
}
