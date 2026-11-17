import type { TerminalProfile, TerminalProfileKind } from '../../../shared/terminalTypes';

export const MAX_SHELL_LINES = 800;

export interface ShellBufferState {
  lines: string[];
  partialLine: string;
}

/** Acumula texto vindo do stream mantendo quebras parciais e limitando o buffer em MAX_SHELL_LINES. */
export function appendTerminalChunk(state: ShellBufferState, chunk: string): ShellBufferState {
  if (!chunk) return state;
  const normalized = chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const combined = state.partialLine + normalized;
  const segments = combined.split('\n');
  const nextPartial = segments.pop() ?? '';
  const mergedLines = [...state.lines, ...segments];
  const lines =
    mergedLines.length > MAX_SHELL_LINES
      ? mergedLines.slice(mergedLines.length - MAX_SHELL_LINES)
      : mergedLines;
  return { lines, partialLine: nextPartial };
}

/** Retorna linhas prontas para exibição no TerminalViewer, incluindo a linha parcial atual se existir. */
export function toDisplayLines(state: ShellBufferState): string[] {
  return state.partialLine ? [...state.lines, state.partialLine] : state.lines;
}

export function formatPromptEcho(prompt: string, command: string): string {
  const cleanPrompt = prompt.trim() || '$';
  return `${cleanPrompt} ${command}`;
}

export function getDefaultShellProfile(profiles: TerminalProfile[]): TerminalProfile | undefined {
  return profiles.find((p) => p.isDefault && p.kind !== 'ssh') || profiles.find((p) => p.kind !== 'ssh');
}

export function getShellInputPlaceholder(kind: TerminalProfileKind): string {
  switch (kind) {
    case 'powershell':
      return 'Comando PowerShell (ex: Get-Process, dir, git status)...';
    case 'cmd':
      return 'Comando CMD (ex: dir, netstat -ano, ipconfig)...';
    case 'git-bash':
    case 'bash':
    case 'wsl':
      return 'Comando shell (ex: ls -la, ps aux, pwd, grep)...';
    case 'ssh':
      return 'Comando na sessão SSH remota...';
    default:
      return 'Comando Karaf (ex: bundle:list, la, feature:list)...';
  }
}

export function isLocalClearCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase();
  return trimmed === 'clear' || trimmed === 'cls';
}
