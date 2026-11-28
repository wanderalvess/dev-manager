import type { KbAskResponse, KbChatTurn } from './knowledgeBaseTypes';

export const KB_NOT_FOUND_ANSWER =
  'Não encontrei isso na Base de Conhecimento. Tente outras palavras, o nome da rota (por exemplo `PUT /embalagem/salvar`) ou tire os filtros.';

const MAX_TURNS = 6;
const MAX_TURN_CHARS = 2000;

const MIXED_SOURCES_RULE =
  'Os trechos misturam código-fonte e TDN. Quando os dois dizerem coisas diferentes, apresente as duas versões, diga qual fonte afirma cada uma ' +
  'e sinalize a divergência em vez de escolher uma; quando concordarem, responda normalmente.';

const CITATION_RULE =
  'Responda em português, só com base nos trechos numerados e cite as fontes como [n] logo após cada afirmação. ' +
  'Se os trechos não bastarem, diga o que falta em vez de completar com suposições.';

/** Mantém só as últimas mensagens, cortando as muito longas, para o histórico não estourar o contexto. */
export function trimHistory(history: readonly KbChatTurn[] | undefined): KbChatTurn[] {
  return (history ?? [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && t.content.trim() !== '')
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_TURN_CHARS) }));
}

/** Mensagens para o LLM: prompt do servidor (já com as fontes [n]) + regras do Hub + histórico + a pergunta. */
export function buildChatMessages(
  ask: Pick<KbAskResponse, 'systemPrompt' | 'userPrompt' | 'mixedSources'>,
  history?: readonly KbChatTurn[]
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const system = [ask.systemPrompt, CITATION_RULE, ask.mixedSources ? MIXED_SOURCES_RULE : ''].filter(Boolean).join('\n\n');
  return [
    { role: 'system', content: system },
    ...trimHistory(history),
    { role: 'user', content: ask.userPrompt }
  ];
}
