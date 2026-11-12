export interface InfrActiveEnvList { active?: string; environments: Array<{ name: string; status: string }>; }
export interface InfrActiveEnvApplyResult { success: boolean; message?: string; }
