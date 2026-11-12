export interface InfrVersionPreviewRequest { distro?: string; infrPath?: string; version: string; }
export interface InfrVersionPreview { ok: boolean; commands: string[]; warnings?: string[]; }
export interface InfrManifestSaveRequest { distro?: string; infrPath?: string; files: Record<string, string>; }
export interface InfrManifestSaveResult { success: boolean; message?: string; }
export interface InfrEnvTemplate { name: string; files: Record<string, string>; }
export interface InfrEnvSaveRequest { distro?: string; name: string; files: Record<string, string>; }
