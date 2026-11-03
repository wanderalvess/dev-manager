import fs from 'fs';
import path from 'path';
import { isValidIdentifier } from '../../utils/security';
import { parseWtaImage, type InfrCloneInfo } from '../../../shared/infrClone';
import { isValidEnvName } from '../../../shared/infrWinthorVersion';
import type { InfrVersionPreview, InfrVersionPreviewRequest } from '../../../shared/infrVersionManifest';
import type { PreflightItem } from '../../../shared/infrPreflight';
import { commandFailureDetail, missingNewVersionScriptsMessage, originContainerMessage } from '../../../shared/infrNewVersionScripts';
import type { WslService } from '../WslService';

type Trace = (line: string) => void;

export interface InfrCloneDeps {
  wsl: Pick<WslService, 'findDockerWslDistro' | 'resolveInfrPaths'>;
  run: (distro: string, script: string, timeout?: number, trace?: Trace) => Promise<string>;
  preflight: (distro: string, target: string, repositories: string[] | null, trace: Trace, ports?: InfrVersionPreviewRequest['ports']) => Promise<PreflightItem[]>;
}

const NEW_VERSION_ENV = 'linux-winthor/scripts/new_version_env.sh';
const EXPORT_FEATURES = 'linux-winthor/scripts/export_features.sh';

/**
 * Leitura de um clone sem mudar nada: descobre a versão pela imagem do wta-<origem>, confere se a imagem existe na distro
 * (o new_version_env.sh pula o build quando existe), se versions/<versão>.features existe (o script exige o arquivo) e, se
 * não existir, lê a lista do próprio WTA de origem para o Hub gravar. Não toca no catálogo da 801 nem troca feature.
 */
export async function previewClone(deps: InfrCloneDeps, req: InfrVersionPreviewRequest, trace: Trace): Promise<InfrVersionPreview> {
  if (!isValidEnvName(req.fromEnv)) return { success: false, error: 'Ambiente de origem inválido (ex.: master).' };
  const distro = req.distro || (await deps.wsl.findDockerWslDistro()) || 'ubuntu2604-winthor';
  if (!isValidIdentifier(distro)) return { success: false, error: 'Distro WSL inválida.' };
  const infr = deps.wsl.resolveInfrPaths(req.infrPath);
  if (!infr) return { success: false, error: 'Pasta do INFR-Docker inválida.' };

  trace(`Clone sem mudar nada: distro ${distro}; pasta do INFR-Docker ${infr.windows} (${infr.wsl})`);
  if (!fs.existsSync(path.join(infr.windows, NEW_VERSION_ENV))) {
    return { success: false, error: missingNewVersionScriptsMessage(infr.windows, [NEW_VERSION_ENV]) };
  }

  const from = req.fromEnv.trim();
  const container = `wta-${from}`;
  const inspected = (await deps.run(distro, `docker inspect -f '{{.Config.Image}}|{{.State.Status}}' ${container} 2>/dev/null || echo missing`, 20000, trace).catch(() => '')).trim();
  const [image = '', state = ''] = inspected.split('|');
  if (!state) return { success: false, error: originContainerMessage(container, 'missing') ?? `O WTA de origem (${container}) não existe nesta distro.` };

  const parsed = parseWtaImage(image);
  if (!parsed) {
    return {
      success: false,
      error: `A imagem do ${container} (${image || 'sem nome'}) não segue o padrão linux-winthor:<versão>-<distro>, então o Hub não sabe de que versão clonar. Como resolver: use a opção de atualizar para uma versão.`
    };
  }
  if (parsed.distro !== 'debian') {
    return { success: false, error: `A imagem do ${container} é da distro "${parsed.distro}"; o Hub clona só imagens debian (o padrão do script).` };
  }
  const { version } = parsed;
  trace(`Versão da origem pela imagem ${image}: ${version}`);

  const imageName = `linux-winthor:${version}-${parsed.distro}`;
  const imageExists = (await deps.run(distro, `docker image inspect ${imageName} >/dev/null 2>&1 && echo yes || echo no`, 20000, trace).catch(() => 'no')).trim() === 'yes';

  const manifestPath = path.join(infr.windows, 'linux-winthor', 'versions', `${version}.features`);
  const manifestExists = fs.existsSync(manifestPath);
  trace(`versions/${version}.features ${manifestExists ? 'já existe' : 'não existe'}; imagem ${imageName} ${imageExists ? 'existe' : 'não existe'}`);

  let manifestText: string | undefined;
  if (!manifestExists && state === 'running' && fs.existsSync(path.join(infr.windows, EXPORT_FEATURES))) {
    const tmp = `/tmp/hub-clone-${from}.features`;
    try {
      await deps.run(distro, `cd "${infr.wsl}/linux-winthor" && bash scripts/export_features.sh --version ${version} --container ${container} --out ${tmp}`, 180000, trace);
      manifestText = await deps.run(distro, `cat ${tmp}`, 20000, trace);
    } catch (err: any) {
      trace(`Não deu para ler a lista do ${container}: ${commandFailureDetail(err)}`);
    }
  }

  // As portas do host que o script fixa pela versão e as editáveis são conferidas na revisão (precisa dos containers em uso);
  // da pré-checagem ficam disco, memória e rede, e a porta só se um processo fora do Docker a ocupa
  const preflight = (await deps.preflight(distro, version, null, trace, req.ports)).filter((i) => i.id !== 'portas' || i.status === 'block');

  const clone: InfrCloneInfo = { version, image: imageName, imageExists, originState: state, manifestExists };
  return { success: true, clone, preflight, ...(manifestText ? { manifestText } : {}) };
}
