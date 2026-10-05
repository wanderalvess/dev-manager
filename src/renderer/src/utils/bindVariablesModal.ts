import { BindInputState, SqlVariablePrefix } from './sqlBinds';

export type BindBadgeTone = 'sqlplus' | 'script' | 'template' | 'native';

export function normalizeBindName(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
}

// Nome já existente é ignorado (mantém a lista original), como no fluxo manual.
export function appendManualBind(
  list: BindInputState[],
  cleanName: string,
  prefix: SqlVariablePrefix
): BindInputState[] {
  if (list.some((b) => b.name === cleanName)) return list;
  return [
    ...list,
    {
      name: cleanName,
      value: '',
      type: 'auto',
      prefix,
      raw: `${prefix}${cleanName}`
    }
  ];
}

export function removeBindAt(list: BindInputState[], idx: number): BindInputState[] {
  return list.filter((_, i) => i !== idx);
}

export function clearBindValues(list: BindInputState[]): BindInputState[] {
  return list.map((item) => ({ ...item, value: '' }));
}

export function updateBindType(
  list: BindInputState[],
  idx: number,
  type: BindInputState['type']
): BindInputState[] {
  return list.map((p, i) => (i === idx ? { ...p, type } : p));
}

export function updateBindValue(list: BindInputState[], idx: number, value: string): BindInputState[] {
  return list.map((p, i) => (i === idx ? { ...p, value } : p));
}

export function getBindBadgeTone(prefix?: SqlVariablePrefix): BindBadgeTone {
  switch (prefix) {
    case '&':
    case '&&':
      return 'sqlplus';
    case '@':
      return 'script';
    case '${}':
    case '#{}':
      return 'template';
    default:
      return 'native';
  }
}

export function getBindValuePlaceholder(item: BindInputState): string {
  if (item.type === 'list') return "Ex: 1, 2, 3 ou 'A', 'B'";
  if (item.type === 'date') return 'YYYY-MM-DD';
  return `Valor para ${item.prefix || ':'}${item.name}...`;
}
