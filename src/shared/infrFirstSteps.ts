export interface InfrFirstStepsActionRequest { distro?: string; action: string; }
export interface InfrFirstStepsResult { ready: boolean; steps: Array<{ id: string; label: string; done: boolean }>; }
