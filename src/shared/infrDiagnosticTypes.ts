export interface InfrDiagnosticRequest { distro?: string; name: string; }
export interface InfrDiagnosticResult { summary: string; details: string; issues: string[]; }
