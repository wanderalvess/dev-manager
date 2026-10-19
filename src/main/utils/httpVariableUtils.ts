import crypto from 'crypto';

/**
 * Utilitário puro para interpolação de variáveis de ambiente em URLs, headers e corpo de requisições.
 * Suporta também variáveis dinâmicas compatíveis com o Postman (ex: {{$randomInt}}, {{$timestamp}}, {{$uuid}}).
 */

export function resolveVariableValue(
  varName: string,
  variables: Record<string, string>
): string | undefined {
  // Variáveis dinâmicas do Postman
  if (varName === '$randomInt') {
    return Math.floor(Math.random() * 10000).toString();
  }
  if (varName === '$timestamp') {
    return Math.floor(Date.now() / 1000).toString();
  }
  if (varName === '$isoDate') {
    return new Date().toISOString();
  }
  if (varName === '$uuid' || varName === '$guid') {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  }

  // Variável do ambiente fornecido
  if (Object.prototype.hasOwnProperty.call(variables, varName)) {
    return variables[varName];
  }

  return undefined;
}

/**
 * Substitui todas as ocorrências de {{nomeVariavel}} na string de entrada.
 * Se a variável não for encontrada no mapa nem for dinâmica, mantém o placeholder original {{nomeVariavel}}.
 */
export function interpolateVariables(
  input: string,
  variables: Record<string, string>
): string {
  if (!input || typeof input !== 'string') return input;

  return input.replace(/\{\{\s*([a-zA-Z0-9_$-]+)\s*\}\}/g, (match, key) => {
    const val = resolveVariableValue(key, variables);
    return val !== undefined ? val : match;
  });
}

/**
 * Converte uma lista de pares chave-valor ativados para um objeto de cabeçalhos/params resolvidos.
 */
export function buildResolvedKeyValueMap(
  items: Array<{ key: string; value: string; enabled: boolean }>,
  variables: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const item of items) {
    if (!item.enabled) continue;
    const resolvedKey = interpolateVariables(item.key.trim(), variables);
    const resolvedVal = interpolateVariables(item.value, variables);
    if (resolvedKey) {
      result[resolvedKey] = resolvedVal;
    }
  }

  return result;
}
