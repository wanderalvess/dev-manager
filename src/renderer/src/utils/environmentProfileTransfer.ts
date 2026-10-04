import type { AutomationProfile } from '../../../shared/types';

const randomSuffix = (): string => Math.random().toString(36).substring(2, 6);

export const generateProfileId = (): string => `profile-${Date.now()}-${randomSuffix()}`;

/** Monta o JSON de exportação de um perfil (formato estável, reimportável). */
export function buildProfileExportData(target: AutomationProfile, now: Date = new Date()) {
  return {
    version: 1,
    type: 'dev-manager-automation-profile',
    exportedAt: now.toISOString(),
    profile: {
      name: target.name,
      description: target.description || '',
      steps: (target.steps || []).map((s) => ({
        name: s.name,
        type: s.type,
        enabled: s.enabled !== false,
        command: s.command || '',
        cwd: s.cwd || '',
        port: s.port,
        waitForPort: s.waitForPort ?? false,
        delayAfterSeconds: s.delayAfterSeconds ?? 2,
        targetName: s.targetName || '',
        browserUrl: s.browserUrl || '',
        launchMode: s.launchMode || 'wt'
      }))
    }
  };
}

/** Nome de arquivo seguro (sem acentos nem caracteres especiais) para o download do perfil. */
export function buildExportFileName(profileName: string): string {
  const safeName = (profileName || 'perfil')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_');
  return `perfil-${safeName}.json`;
}

/** Cópia do perfil com novos ids de perfil e de passos, para não colidir com o original. */
export function buildDuplicatedProfile(source: AutomationProfile): AutomationProfile {
  return {
    ...source,
    id: generateProfileId(),
    name: `${source.name} (Cópia)`,
    isDefault: false,
    steps: (source.steps || []).map((s) => ({
      ...s,
      id: `step-${Date.now()}-${randomSuffix()}`
    }))
  };
}

/**
 * Converte o JSON importado em perfil. Aceita o formato exportado `{ profile: { ... } }`
 * ou direto `{ name, steps }`. Retorna `null` quando não há lista de etapas válida.
 */
export function buildImportedProfile(parsed: any): AutomationProfile | null {
  const rawProfile = parsed.profile || (parsed.steps ? parsed : null);
  if (!rawProfile || !Array.isArray(rawProfile.steps)) return null;

  return {
    id: generateProfileId(),
    name: rawProfile.name ? `${rawProfile.name} (Importado)` : 'Perfil Importado',
    description: rawProfile.description || '',
    isDefault: false,
    steps: (rawProfile.steps || []).map((s: any, idx: number) => ({
      id: `step-${Date.now()}-${idx}-${randomSuffix()}`,
      name: s.name || `Etapa ${idx + 1}`,
      type: s.type || 'command',
      enabled: s.enabled !== false,
      command: s.command || '',
      cwd: s.cwd || '',
      port: s.port,
      waitForPort: s.waitForPort ?? false,
      delayAfterSeconds: s.delayAfterSeconds ?? 2,
      targetName: s.targetName || '',
      browserUrl: s.browserUrl || '',
      launchMode: s.launchMode || 'wt',
      dbConnectionId: s.dbConnectionId || '',
      sql: s.sql || ''
    }))
  };
}

/** Substitui o perfil de mesmo id ou o anexa ao final da lista. */
export function upsertProfile(list: AutomationProfile[], saved: AutomationProfile): AutomationProfile[] {
  return list.some((p) => p.id === saved.id)
    ? list.map((p) => (p.id === saved.id ? saved : p))
    : [...list, saved];
}

/** Liga/desliga um passo do perfil indicado, preservando os demais perfis. */
export function setStepEnabled(
  list: AutomationProfile[],
  fallbackProfile: AutomationProfile,
  stepId: string,
  enabled: boolean
): { profiles: AutomationProfile[]; activeId: string } {
  const current = list.find((p) => p.id === fallbackProfile.id) || fallbackProfile;
  const updatedSteps = (current.steps || []).map((s) => (s.id === stepId ? { ...s, enabled } : s));
  const updated = { ...current, steps: updatedSteps };
  return { profiles: list.map((p) => (p.id === current.id ? updated : p)), activeId: current.id };
}
