export type TerminalProfileKind = 'karaf' | 'powershell' | 'cmd' | 'git-bash' | 'bash' | 'wsl' | 'ssh';

export interface TerminalProfile {
  id: string;
  label: string;
  kind: TerminalProfileKind;
  prompt: string;
  subtitle?: string;
  isDefault?: boolean;
}

export interface TerminalCreateRequest {
  profileId: string;
  cwd?: string;
  sshTarget?: string;
  sshPort?: number;
}

export interface TerminalSessionInfo {
  sessionId: string;
  profileId: string;
  kind: TerminalProfileKind;
  title: string;
  prompt: string;
  cwd: string;
  pid?: number;
  alive: boolean;
}

export interface TerminalDataEvent {
  sessionId: string;
  chunk: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  code: number | null;
}
