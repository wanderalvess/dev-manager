import {
  LINK_KIND_LABEL,
  PHASE_LABEL,
  RESULT_LABEL,
  normalizeLinkUrl,
  summarizeEvidence,
  type EvidenceBlock,
  type EvidenceResult,
  type EvidenceSession,
  type EvidenceStep
} from './evidenceTypes';

/** Limite do campo Descrição de um pull request. */
export const PR_DESCRIPTION_MAX_CHARS = 4000;

const ICON: Record<EvidenceResult, string> = { passed: '✅', failed: '❌', pending: '⏳' };

/** Uma linha só, cortada no tamanho e sem o que o Markdown/HTML do PR interpretaria (tags, crase). */
const oneLine = (value: string | undefined, max: number): string => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  const cut = text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return cut.replace(/</g, '&lt;').replace(/`/g, "'");
};

const label = (value: string | undefined, max: number): string => oneLine(value, max).replace(/[[\]|]/g, ' ');

const blockLine = (block: EvidenceBlock): string => {
  const phase = block.phase === 'single' ? '' : `[${PHASE_LABEL[block.phase]}] `;
  const verdict = block.verdict
    ? block.verdict.passed
      ? ' · regras ✅'
      : ` · regras ❌ (${block.verdict.results
          .filter((r) => !r.ok)
          .map((r) => oneLine(r.rule, 60))
          .join('; ')})`
    : '';
  if (block.kind === 'text') return `${phase}Anotação${block.title ? `: ${oneLine(block.title, 80)}` : ''}`;
  const meta = block.meta ? ` → ${oneLine(block.meta, 80)}` : '';
  if (block.kind === 'api') {
    const first = (block.request ?? '').split(/\r?\n/)[0];
    return `${phase}API \`${oneLine(first, 140)}\`${meta}${verdict}`;
  }
  const query = block.title ? oneLine(block.title, 80) : `\`${oneLine(block.request, 100)}\``;
  return `${phase}SQL ${query}${meta}${verdict}`;
};

/** Nível 3: tudo; 2: esperado/obtido só dos reprovados; 1: só título e resultado do passo. */
const stepLines = (step: EvidenceStep, index: number, level: 1 | 2 | 3): string[] => {
  const lines = [`${index + 1}. ${ICON[step.result]} ${oneLine(step.title, 120) || 'Passo sem título'}`];
  if (level === 3 && step.expected) lines.push(`   - Esperado: ${oneLine(step.expected, 200)}`);
  if ((level === 3 || (level === 2 && step.result === 'failed')) && step.actual) lines.push(`   - Obtido: ${oneLine(step.actual, 200)}`);
  if (level >= 2) for (const block of step.blocks ?? []) lines.push(`   - ${blockLine(block)}`);
  return lines;
};

const header = (session: EvidenceSession): string[] => {
  const summary = summarizeEvidence(session.steps);
  const lines = [`## ${oneLine(session.title || session.task, 150) || 'Evidência'}`, ''];
  const facts = [
    session.task && `- **Tarefa:** ${oneLine(session.task, 60)}`,
    `- **Tipo:** ${session.kind === 'qa' ? 'Teste (QA)' : 'Desenvolvimento'}`,
    `- **Resultado:** ${ICON[summary.verdict]} ${RESULT_LABEL[summary.verdict]} (${summary.passed} aprovados, ${summary.failed} reprovados, ${summary.pending} pendentes de ${summary.total} passos)`,
    session.tester && `- **Responsável:** ${oneLine(session.tester, 80)}`,
    session.environment && `- **Ambiente:** ${oneLine(session.environment, 200)}`
  ].filter(Boolean) as string[];
  lines.push(...facts);
  const links = (session.links ?? []).flatMap((l) => {
    const url = normalizeLinkUrl(l.url);
    return url ? [`- ${LINK_KIND_LABEL[l.kind] ?? LINK_KIND_LABEL.other}: ${l.label ? `[${label(l.label, 80)}](${url})` : url}`] : [];
  });
  if (links.length) lines.push('', '### Links', ...links);
  return lines;
};

const FOOTER = '_Prints, vídeos e respostas completas estão no relatório da evidência (anexo no Jira)._';

/**
 * Resumo da evidência em Markdown para a descrição do pull request, dentro do limite do campo.
 * Tenta o texto completo e vai tirando detalhe (esperado/obtido, depois as provas) até caber; só então corta passos.
 */
export function buildPrDescription(session: EvidenceSession, max: number = PR_DESCRIPTION_MAX_CHARS): string {
  const head = header(session);
  const assemble = (steps: string[][], hidden: number): string =>
    [
      ...head,
      ...(session.steps.length ? ['', '### Passos', ...steps.flat()] : []),
      ...(hidden > 0 ? [`… e mais ${hidden} ${hidden === 1 ? 'passo' : 'passos'} (veja o relatório da evidência).`] : []),
      '',
      FOOTER
    ].join('\n');

  for (const level of [3, 2, 1] as const) {
    const text = assemble(session.steps.map((s, i) => stepLines(s, i, level)), 0);
    if (text.length <= max) return text;
  }
  for (let keep = session.steps.length - 1; keep >= 0; keep--) {
    const text = assemble(session.steps.slice(0, keep).map((s, i) => stepLines(s, i, 1)), session.steps.length - keep);
    if (text.length <= max) return text;
  }
  return `${assemble([], session.steps.length).slice(0, max - 1)}…`;
}
