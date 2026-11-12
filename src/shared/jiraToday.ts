export interface JiraTodayReport { configured: boolean; inProgress: Array<{ key: string; summary: string; status: string }>; updatedAt?: string; }
