import { execFileAsync } from '../../utils/security';
import type { DockerContext } from './dockerContext';

export const CONTAINER_ALIASES: Record<string, string[]> = {
  'oracle-winthor': ['oracle-local', 'oracle', 'oracle-xe', 'winthor-oracle'],
  'oracle-local': ['oracle-winthor', 'oracle', 'oracle-xe', 'winthor-oracle'],
  'oracle': ['oracle-local', 'oracle-winthor', 'oracle-xe'],
  'oracle-xe': ['oracle-local', 'oracle-winthor'],
  'linux-winthor': ['wta-local', 'wta', 'wta-winthor'],
  'wta-local': ['linux-winthor', 'wta', 'wta-winthor'],
  'wta': ['wta-local', 'linux-winthor', 'wta-winthor'],
  'wta-winthor': ['wta-local', 'linux-winthor'],
  'wsh-winthor': ['wsh-local', 'wsh'],
  'wsh-local': ['wsh-winthor', 'wsh'],
  'wsh': ['wsh-local', 'wsh-winthor']
};

/**
 * Resolve um alias existente caso o nome de container informado não exista
 * na distro ativa, mas seu equivalente exista (ex: oracle-winthor <-> oracle-local).
 */
export async function resolveContainerAlias(ctx: DockerContext, targetName: string): Promise<string | null> {
  const clean = targetName.toLowerCase().trim();
  const candidates = CONTAINER_ALIASES[clean];
  if (!candidates || candidates.length === 0) return null;

  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('ps', ['-a', '--format', '{{.Names}}']);
    const { stdout } = await execFileAsync(binary, finalArgs, { timeout: 6000, windowsHide: true });
    const existingNames = stdout
      .trim()
      .split('\n')
      .map((n) => n.replace(/^\//, '').trim().toLowerCase())
      .filter(Boolean);

    for (const candidate of candidates) {
      if (existingNames.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
  } catch {
    // Ignora erro de checagem prévia
  }
  return null;
}
