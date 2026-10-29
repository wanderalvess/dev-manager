import { findFlowByRoute, flowDirection, flowLabel, hintedDependencies, findFlowById } from './wshFlowCatalog';
import type { WshDependency, WshItem, WshItemError } from './wshMonitorTypes';

/**
 * "Como resolver", nível 1: regras sobre o que o Hub já sabe do item (erros do PDVSync, catálogo de fluxos e a
 * situação das dependências). Só afirma o que os dados mostram; o resto vira "confira", nunca causa certa.
 */

export type WshSuggestionKind = 'fix-items' | 'fix-field' | 'origin' | 'dependency' | 'enum' | 'empty-field' | 'no-detail';

export interface WshSuggestion {
  kind: WshSuggestionKind;
  title: string;
  detail: string;
  /** Página do TDN que o PDVSync indicou para o erro. */
  docUrl?: string;
  /** Campos do erro que o nível 2 pode procurar no layout do WSH. */
  fields?: string[];
}

const ENUM_MESSAGE = /enum/i;
const EMPTY_MESSAGE = /nulo|vazio|obrigat/i;
const MAX_IDS = 6;

const target = (item: Pick<WshItem, 'route'>) => (flowDirection(item.route) === 'recebimento' ? 'WinThor' : 'PDVSync');
const unique = <T,>(values: T[]) => [...new Set(values)];
const listIds = (ids: string[]) => (ids.length > MAX_IDS ? `${ids.slice(0, MAX_IDS).join(', ')} e mais ${ids.length - MAX_IDS}` : ids.join(', '));
const firstDoc = (errors: WshItemError[]) => errors.find((error) => error.docUrl)?.docUrl;

/** Erros com a mesma mensagem viram uma sugestão só (o PDVSync repete o erro por item). */
function byMessage(errors: WshItemError[], test: RegExp): Map<string, WshItemError[]> {
  const groups = new Map<string, WshItemError[]>();
  for (const error of errors) {
    if (!error.messages.some((message) => test.test(message))) continue;
    const key = `${error.field}|${error.messages.join(';')}`;
    groups.set(key, [...(groups.get(key) ?? []), error]);
  }
  return groups;
}

function messageSuggestions(item: WshItem, errors: WshItemError[]): WshSuggestion[] {
  const suggestions: WshSuggestion[] = [];
  for (const group of byMessage(errors, ENUM_MESSAGE).values()) {
    const { field } = group[0];
    const ids = unique(group.map((error) => error.externalId).filter((id): id is string => Boolean(id)));
    suggestions.push({
      kind: 'enum',
      title: `O ${target(item)} não aceita o valor de "${field}"`,
      detail: `O valor que o WSH mandou em "${field}"${ids.length ? ` para ${listIds(ids)}` : ''} não está na lista aceita por este ${target(item)}. Veja abaixo como o WSH monta "${field}" e compare com a documentação: costuma ser diferença entre a versão do layout do WSH e a do ${target(item)}.`,
      docUrl: firstDoc(group),
      fields: [field]
    });
  }
  for (const group of byMessage(errors, EMPTY_MESSAGE).values()) {
    const { field } = group[0];
    const ids = unique(group.map((error) => error.externalId).filter((id): id is string => Boolean(id)));
    suggestions.push({
      kind: 'empty-field',
      title: `"${field}" foi vazio${ids.length ? ` em ${listIds(ids)}` : ''}`,
      detail: `O WSH mandou "${field}" sem valor. O dado não veio da origem ou de um fluxo de que este depende; confira o cadastro desses itens e as dependências abaixo.`,
      docUrl: firstDoc(group),
      fields: [field]
    });
  }
  return suggestions;
}

/** Campo recusado cuja origem o catálogo conhece (conferida num par real): diz onde olhar na entrada. */
function originSuggestions(item: WshItem, errors: WshItemError[]): WshSuggestion[] {
  const origins = findFlowByRoute(item.route)?.fieldOrigins;
  if (!origins) return [];
  const source = flowDirection(item.route) === 'recebimento' ? 'PDVSync' : 'WinThor';
  return unique(errors.map((error) => error.field))
    .filter((field) => origins[field])
    .map((field) => ({
      kind: 'origin' as const,
      title: `"${field}" vem de ${origins[field]} no ${source}`,
      detail: `O WSH copia esse valor do registro no ${source}. Confira lá o valor de ${origins[field]}: se estiver certo, falta no ${target(item)} o cadastro equivalente.`,
      fields: [field]
    }));
}

function dependencySuggestions(item: WshItem, dependencies: WshDependency[] | undefined): WshSuggestion[] {
  const flow = findFlowByRoute(item.route);
  if (!flow) return [];
  const fields = [...item.ownErrors, ...item.otherErrors].map((error) => error.field);
  const hinted = hintedDependencies(flow, fields);
  const suggestions: WshSuggestion[] = hinted.map((id) => {
    const dep = findFlowById(id);
    const status = dependencies?.find((entry) => entry.flowId === id);
    const field = Object.entries(flow.fieldHints ?? {}).find(([, flowId]) => flowId === id)?.[0];
    const situation = !status
      ? 'Confira se ele integrou.'
      : !status.found
        ? 'Ele nunca integrou neste banco: rode-o antes.'
        : status.lastTone === 'error'
          ? 'A última integração dele deu erro: resolva-a primeiro.'
          : 'Confira se ele rodou depois da última mudança no cadastro.';
    return {
      kind: 'dependency' as const,
      title: `"${field}" vem do ${dep ? flowLabel(dep) : `FLUXO-${id}`}`,
      detail: `${flowLabel(flow)} monta "${field}" com o que o ${dep ? flowLabel(dep) : `FLUXO-${id}`} levou ao PDVSync. ${situation}`
    };
  });
  // Dependência quebrada que o campo não apontou também conta
  for (const status of dependencies ?? []) {
    if (hinted.includes(status.flowId)) continue;
    if (!status.found || status.lastTone === 'error') {
      suggestions.push({
        kind: 'dependency',
        title: `${flowLabel({ id: status.flowId, name: status.flowName })} ${status.found ? 'está com erro' : 'nunca integrou'}`,
        detail: `${flowLabel(flow)} depende dele; sem ele no PDVSync, os registros deste fluxo saem incompletos ou são recusados.`
      });
    }
  }
  return suggestions;
}

/** Sugestões em ordem de ação: primeiro o que destrava o envio, depois o porquê e as dependências. */
export function suggestWshFixes(item: WshItem, dependencies?: WshDependency[]): WshSuggestion[] {
  if (item.tone !== 'error') return [];
  const suggestions: WshSuggestion[] = [];
  if (item.ownErrors.length === 0 && item.otherErrors.length > 0) {
    const ids = unique(item.otherErrors.map((error) => error.externalId).filter((id): id is string => Boolean(id)));
    suggestions.push({
      kind: 'fix-items',
      title: 'Corrija os itens que derrubaram o envio',
      detail: `Este item não tem erro: o ${target(item)} recusou a requisição inteira por causa de ${ids.length ? listIds(ids) : 'outros itens'}. Corrigidos esses, o WSH reenvia e este item passa junto.`
    });
  }
  for (const error of item.ownErrors) {
    if (ENUM_MESSAGE.test(error.messages.join(' ')) || EMPTY_MESSAGE.test(error.messages.join(' '))) continue;
    suggestions.push({
      kind: 'fix-field',
      title: `Corrija "${error.field}" neste item`,
      detail: error.messages.join('; '),
      docUrl: error.docUrl,
      fields: [error.field]
    });
  }
  suggestions.push(...messageSuggestions(item, [...item.ownErrors, ...item.otherErrors]));
  suggestions.push(...originSuggestions(item, [...item.ownErrors, ...item.otherErrors]));
  suggestions.push(...dependencySuggestions(item, dependencies));
  if (suggestions.length === 0) {
    suggestions.push({
      kind: 'no-detail',
      title: 'O erro não veio detalhado',
      detail: `O WSH marcou erro, mas a resposta do ${target(item)} não trouxe campo nem mensagem. Abra a resposta completa (OBSERVACAO) abaixo.`
    });
  }
  return suggestions;
}

/** Campos citados nas sugestões, para o nível 2 procurar no layout. */
export function suggestionFields(suggestions: WshSuggestion[]): string[] {
  return unique(suggestions.flatMap((suggestion) => suggestion.fields ?? []));
}
