/** Comandos rápidos do Karaf que o desenvolvedor escolhe ver em Deploy › Diagnósticos e no dock do console. */
export interface KarafQuickCommand {
  id: string;
  label: string;
  command: string;
}

export const MAX_QUICK_COMMANDS = 24;
const MAX_LABEL = 40;
const MAX_COMMAND = 300;

export const DEFAULT_QUICK_COMMANDS: KarafQuickCommand[] = [
  { id: 'features-i', label: 'Features Ativas', command: 'feature:list -i' },
  { id: 'bundles-s', label: 'Bundles Ativos', command: 'bundle:list -s' },
  { id: 'bundles-diag', label: 'Diag Falhas', command: 'bundle:diag' },
  { id: 'repos', label: 'Repositórios', command: 'feature:repo-list' },
  { id: 'logs-50', label: 'Últimos Logs', command: 'log:display -n 50' },
  { id: 'log-clear', label: 'Limpar Logs', command: 'log:clear' }
];

export function newQuickCommandId(): string {
  return `qc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Uma linha só: quebra de linha no comando executaria um segundo comando escondido. */
export function isValidQuickCommand(command: string): boolean {
  const clean = command.trim();
  return clean.length > 0 && clean.length <= MAX_COMMAND && !/[\r\n\0]/.test(clean);
}

/**
 * Normaliza a lista lida do storage ou editada na tela: descarta itens inválidos, corta tamanhos, garante ids únicos
 * e limita a quantidade. Retorna null quando o valor nem é uma lista (storage vazio ou corrompido → usar o padrão).
 */
export function sanitizeQuickCommands(raw: unknown): KarafQuickCommand[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const result: KarafQuickCommand[] = [];
  for (const item of raw) {
    if (result.length >= MAX_QUICK_COMMANDS) break;
    if (!item || typeof item !== 'object') continue;
    const { id, label, command } = item as Record<string, unknown>;
    if (typeof command !== 'string' || !isValidQuickCommand(command)) continue;
    const cleanCommand = command.trim();
    const cleanLabel = (typeof label === 'string' ? label.trim() : '') || cleanCommand;
    const cleanId = typeof id === 'string' && id && !seen.has(id) ? id : newQuickCommandId();
    seen.add(cleanId);
    result.push({ id: cleanId, label: cleanLabel.slice(0, MAX_LABEL), command: cleanCommand });
  }
  return result;
}

const DESTRUCTIVE =
  /^\s*(?:feature:uninstall|feature:repo-remove|bundle:uninstall|bundle:stop|log:clear|system:shutdown|shutdown)\b/i;

/** Comandos que removem estado do Karaf ou apagam log e merecem confirmação antes de rodar. */
export function isDestructiveKarafCommand(command: string): boolean {
  return DESTRUCTIVE.test(command);
}
