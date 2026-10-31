/** Quantas chaves de primeiro nível mudaram entre o salvo e o rascunho (uma lista editada conta uma vez). */
export function countChangedSettingsKeys(saved: Record<string, unknown>, draft: Record<string, unknown>): number {
  const keys = new Set([...Object.keys(saved), ...Object.keys(draft)]);
  let changed = 0;
  for (const key of keys) {
    if (JSON.stringify(saved[key]) !== JSON.stringify(draft[key])) changed++;
  }
  return changed;
}
