export function buildWatchCommand(action: 'start' | 'stop' | 'list', rawTarget: string): string | null {
  if (action === 'list') return 'bundle:watch --list';
  const target = rawTarget.trim() || '*';
  if (/[;|&$`]/.test(target)) return null;
  if (action === 'stop') return `bundle:watch --stop ${target}`;
  return `bundle:watch ${target}`;
}
