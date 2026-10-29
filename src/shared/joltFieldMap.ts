/**
 * "Como resolver", nível 2: onde o JOLT da rota monta um campo. Lê a LAYOUTTRANSFORMACAO (a lista de operações
 * JOLT que o WSH executa) e devolve cada regra que escreve no campo, com o caminho de condições até ela.
 * Ex.: no layout de cobranças, `id = PIX*` escreve `tipo = 8`.
 */

export interface JoltFieldMapping {
  /** Posição da operação na lista (1, 2, ...) e o tipo dela (shift, default, modify-overwrite-beta...). */
  step: number;
  operation: string;
  /** Chaves do spec até a regra, sem os curingas de lista (`items`, `*`). */
  path: string[];
  /** Para onde a regra escreve, como está no spec. */
  target: string;
  /** Valor fixo escrito (chave `#8` num shift, valor num default/modify). */
  value?: string;
  /** Identificadores do item que casam com alguma condição do caminho (ex.: PIXS casa com PIX*). */
  matches: string[];
  /** Valor fixo de um shift (`#8`): no Jolt oficial sai sempre como texto, até um passo seguinte converter. */
  literalText?: boolean;
  /** Passo seguinte que converte o campo (ex.: `=toInteger no passo 3`). */
  convertedBy?: string;
  /** O valor é uma variável do WSH (`{{MASTER_ID_PROPRIETARIO}}`): opaca, trocada pelo WSH na execução. */
  wshVariable?: boolean;
}

/** Operações do WSH que só decodificam (Base64 → objeto) e não escrevem campo novo. */
const DECODE_OPERATIONS = new Set(['custom-totvs', 'custom-decode']);
const WSH_VARIABLE = /^\{\{[^}]+\}\}$/;

const MAX_MAPPINGS = 30;
const NOISE = new Set(['items', '*', 'data', '@']);

/** Último nome do caminho de saída: `items.[&5].tipo` → `tipo`; `data.lojaLotes[&3].status` → `status`. */
export function targetField(outputPath: string): string {
  const last = outputPath.split('.').filter(Boolean).pop() ?? '';
  return last.replace(/\[[^\]]*\]/g, '');
}

/** Curinga do JOLT (`PIX*`, `CH*`) como teste; alternativas com `|` também valem. */
function wildcardMatches(pattern: string, value: string): boolean {
  if (pattern === '*' || pattern.startsWith('@') || pattern.startsWith('#') || pattern.startsWith('$')) return false;
  return pattern.split('|').some((option) => {
    const regex = new RegExp(`^${option.replace(/[.+?^${}()[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i');
    return regex.test(value);
  });
}

/**
 * Caminho legível: some com `items`, `*` de lista e o `#valor` final; o `*` logo antes do valor é o
 * "senão" da regra e vira "qualquer outro".
 */
function readablePath(path: string[]): string[] {
  return path
    .map((segment, i) => (segment === '*' && path[i + 1]?.startsWith('#') ? 'qualquer outro' : segment))
    .filter((segment) => !NOISE.has(segment) && !segment.startsWith('#'));
}

function parseOperations(layout: unknown): { operation: string; spec: unknown }[] {
  let value = layout;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is { operation?: unknown; spec?: unknown } => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({ operation: String(entry.operation ?? '?'), spec: entry.spec }));
}

/** Regras do layout que escrevem em `field`, com os identificadores do item que casam com as condições. */
export function joltFieldMappings(layout: unknown, field: string, itemIds: string[] = []): JoltFieldMapping[] {
  const mappings: JoltFieldMapping[] = [];
  const wanted = field.toLowerCase();
  parseOperations(layout).forEach(({ operation, spec }, index) => {
    // custom-totvs só decodifica Base64 antes do shift: muda a estrutura, mas não escreve o campo
    if (DECODE_OPERATIONS.has(operation)) return;
    const isShift = operation === 'shift';
    const walk = (node: unknown, chain: string[]) => {
      if (mappings.length >= MAX_MAPPINGS || !node || typeof node !== 'object' || Array.isArray(node)) return;
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        const outputs = typeof value === 'string' ? [value] : Array.isArray(value) && value.every((v) => typeof v === 'string') ? (value as string[]) : null;
        if (isShift && outputs) {
          for (const output of outputs) {
            if (targetField(output).toLowerCase() !== wanted) continue;
            const path = [...chain, key];
            mappings.push({
              step: index + 1,
              operation,
              path: readablePath(path),
              target: output,
              ...(key.startsWith('#') ? { value: key.slice(1), literalText: true } : {}),
              matches: itemIds.filter((id) => path.some((segment) => wildcardMatches(segment, id)))
            });
          }
        } else if (!isShift && key.toLowerCase() === wanted && (typeof value !== 'object' || value === null)) {
          const text = String(value);
          mappings.push({
            step: index + 1,
            operation,
            path: chain.filter((s) => !NOISE.has(s)),
            target: key,
            value: text,
            matches: [],
            ...(WSH_VARIABLE.test(text) ? { wshVariable: true } : {})
          });
        } else {
          walk(value, [...chain, key]);
        }
      }
    };
    walk(spec, []);
  });
  // Liga o valor fixo de um shift à conversão que vem depois (ex.: "#8" é texto até o =toInteger do passo 3)
  for (const mapping of mappings) {
    if (!mapping.literalText) continue;
    const conversion = mappings.find((m) => m.step > mapping.step && m.operation !== 'shift' && m.value?.startsWith('='));
    if (conversion) mapping.convertedBy = `${conversion.value} no passo ${conversion.step}`;
  }
  return mappings;
}
