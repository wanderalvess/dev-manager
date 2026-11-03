import { isValidEnvName } from '../../../shared/infrWinthorVersion';
import {
  activeEnvSettingsPatch,
  describeEnvironment,
  isActiveEnvStale,
  type InfrActiveEnvApplyResult,
  type InfrActiveEnvList
} from '../../../shared/infrActiveEnv';
import type { InfrEnvironmentsResult } from '../../../shared/infrWinthorVersion';
import type { AppSettings } from '../../../shared/types';

/**
 * Ambiente ativo: lista os ambientes da distro com as portas reais do docker ps e, ao escolher um, aponta a URL
 * do WTA, a da Rotina 801 e a porta SSH do Karaf das Configurações para ele. O resto do Hub (rotinas, 801,
 * integrações, MCP) já lê essas configurações, então passa a falar com o ambiente escolhido sem mudar.
 */
export class InfrActiveEnvService {
  constructor(
    private readonly versions: { listEnvironments: (distro?: string) => Promise<InfrEnvironmentsResult> },
    private readonly config: { getSettings: () => AppSettings; saveSettings: (s: Partial<AppSettings>) => AppSettings }
  ) {}

  public async list(distro?: string): Promise<InfrActiveEnvList> {
    const r = await this.versions.listEnvironments(distro);
    if (!r.success) return { success: false, error: r.error, distro: r.distro, environments: [] };
    const settings = this.config.getSettings();
    const environments = r.environments.map(describeEnvironment);
    const active = settings.activeEnvironment?.trim() || undefined;
    const stale = isActiveEnvStale(environments.find((e) => e.name === active), settings.wtaUrl);
    return { success: true, distro: r.distro, environments, active, stale };
  }

  public async apply(req: { distro?: string; name: string }): Promise<InfrActiveEnvApplyResult> {
    if (!isValidEnvName(req.name)) return { success: false, error: 'Nome de ambiente inválido.', changes: [] };
    const r = await this.versions.listEnvironments(req.distro);
    if (!r.success) return { success: false, error: r.error, changes: [] };
    const found = r.environments.find((e) => e.name === req.name.trim());
    if (!found) return { success: false, error: `O ambiente ${req.name} não existe na distro ${r.distro ?? ''} (precisa de um container wta-${req.name}).`, changes: [] };

    const env = describeEnvironment(found);
    const { patch, changes } = activeEnvSettingsPatch(env, this.config.getSettings());
    this.config.saveSettings(patch as Partial<AppSettings>);

    let note: string | undefined;
    if (env.portsSource === 'versao') note = `O WTA está parado: as portas vêm do padrão da versão ${env.name} (web ${env.ports.web}). Se o ambiente usa outras, suba-o e escolha de novo.`;
    else if (env.portsSource === 'desconhecida') note = `O WTA está parado e o nome ${env.name} não é uma versão: o Hub não sabe a porta. As URLs não mudaram; suba o ambiente e escolha de novo.`;
    return { success: true, env, changes, note };
  }

  /** Volta a não ter ambiente ativo; as URLs ficam como estão. */
  public clear(): { success: boolean } {
    this.config.saveSettings({ activeEnvironment: '' });
    return { success: true };
  }
}
