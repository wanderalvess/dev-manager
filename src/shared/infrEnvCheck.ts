export type InfrRole = 'oracle' | 'wta' | 'wsh';
export type InfrCheckCommandId = string;
export interface InfrEnvCheck { name: string; ok: boolean; checks: Array<{ id: string; label: string; ok: boolean; detail?: string }>; }
