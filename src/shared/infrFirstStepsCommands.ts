/**
 * Comandos e arquivos dos Primeiros passos (do zero ao ambiente WinThor no Docker). Tudo aqui é
 * texto puro: a tela mostra para copiar e o main monta o mesmo comando para executar, a partir dos
 * mesmos dados validados (a tela nunca manda texto livre para rodar).
 */
import { INFR_NEW_VERSION_BRANCH } from './infrNewVersionScripts';
import { isValidWinthorVersion, winthorVersionPorts } from './infrWinthorVersion';

export const INFR_REPO_URL = 'https://totvstfs.visualstudio.com/Linha-Winthor/_git/INFR-Docker';
export const INFR_DEFAULT_WINDOWS_FOLDER = 'C:\\projetos\\INFR-Docker';
export const INFR_DISTRO_NAME = 'ubuntu2604-winthor';
export const INFR_DISTRO_TAR = 'ubuntu2604-winthor-26-07-22.tar';
export const INFR_DISTRO_INSTALL_DIR = 'C:\\WSL\\ubuntu2604-winthor';
export const INFR_TEAM_DRIVE_URL = 'https://drive.google.com/drive/folders/1oAjcfpickVwFOr7NDtuIcVLLRvc2iduA';

/** Scripts de montar do zero (e os da Nova versão, que ficam no mesmo branch). */
export const INFR_SETUP_SCRIPTS = [
  'oracle-winthor/oracle_setup.sh',
  'linux-winthor/scripts/wta_setup.sh',
  'linux-winthor/scripts/build_version.sh',
  'wsh-winthor/wsh_setup.sh'
] as const;

export const INFR_PCSIST_PATH = 'linux-winthor/utils/pcsist.tar.gz';

/** Arquivos de ambiente da versão: o wta_setup.sh --version lê o wta.env.<v> e o wsh_setup.sh o .env.<v>. */
export function infrEnvFiles(version: string): { wta: string; wtaExample: string; wsh: string; wshExample: string } {
  return {
    wta: `linux-winthor/wta.env.${version}`,
    wtaExample: 'linux-winthor/common/wta.env.example',
    wsh: `wsh-winthor/.env.${version}`,
    wshExample: 'wsh-winthor/.env.example'
  };
}

/** Containers do ambiente "do zero": um por versão, como no resto do assistente (oracle-39, wta-39, wsh-39). */
export function firstStepsContainers(version: string): { oracle: string; wta: string; wsh: string } {
  return { oracle: `oracle-${version}`, wta: `wta-${version}`, wsh: `wsh-${version}` };
}

export const WSL_INSTALL_COMMAND = 'wsl --install --no-distribution';
export const WSL_UPDATE_COMMAND = 'wsl --update';

export function wslImportCommand(tarPath: string, name = INFR_DISTRO_NAME, dir = INFR_DISTRO_INSTALL_DIR): string {
  return `wsl --import ${name} ${dir} "${tarPath}"`;
}

/** Clonar no C:\projetos (a pasta que o manual usa) já no branch dos scripts por versão. PowerShell. */
export function infrCloneCommand(folder = INFR_DEFAULT_WINDOWS_FOLDER): string {
  const parent = folder.replace(/\\[^\\]+$/, '');
  return (
    `New-Item -ItemType Directory -Force "${parent}" | Out-Null; ` +
    `git clone ${INFR_REPO_URL} "${folder}"; git -C "${folder}" checkout ${INFR_NEW_VERSION_BRANCH}`
  );
}

/** Pasta clonada no branch errado. PowerShell (o git do Windows, onde a pasta está). */
export function infrCheckoutCommand(folder: string): string {
  return `git -C "${folder}" fetch origin; git -C "${folder}" checkout ${INFR_NEW_VERSION_BRANCH}`;
}

const SCHEMA = /^[A-Za-z][A-Za-z0-9_$#]{0,29}$/;
const CODCLIPC = /^\d{1,8}$/;
const DUMP_FILE = /^[\w.-]+\.dmp$/i;

export interface DumpImportInput {
  version: string;
  file: string;
  schema: string;
  codclipc: string;
}

/** Erro do formulário do dump, ou null quando dá para importar. */
export function dumpImportError(input: Partial<DumpImportInput>): string | null {
  if (!isValidWinthorVersion(input.version)) return 'Versão do WinThor inválida.';
  if (!input.file || !DUMP_FILE.test(input.file)) return 'Escolha um arquivo .dmp de /opt/dumps.';
  if (!input.schema || !SCHEMA.test(input.schema)) return 'Schema inválido (letras, números e _).';
  if (!input.codclipc || !CODCLIPC.test(input.codclipc)) return 'codclipc inválido (só números).';
  return null;
}

/**
 * Import do dump pelo import_dump.sh do oracle-winthor. A senha do system é pedida no próprio
 * terminal (read -s): não passa pelo Hub, não fica no histórico nem no log.
 */
export function dumpImportCommand(input: DumpImportInput): string {
  const { oracle } = firstStepsContainers(input.version.trim());
  return (
    `read -r -s -p 'Senha do system no ${oracle} (pcinfo): ' P; echo; ` +
    `docker exec -it ${oracle} import_dump.sh system "$P" ${input.file} ${input.schema.toUpperCase()} ${input.codclipc}`
  );
}

/** Troca (ou acrescenta) as chaves no texto de um .env, mantendo comentários e a ordem. */
export function applyEnvValues(text: string, values: Record<string, string>): string {
  const pending = new Map(Object.entries(values));
  const lines = text.split(/\r?\n/).map((line) => {
    const key = /^\s*([A-Z0-9_]+)\s*=/.exec(line)?.[1];
    if (!key || !pending.has(key)) return line;
    const value = pending.get(key) as string;
    pending.delete(key);
    return `${key}=${value}`;
  });
  for (const [key, value] of pending) lines.push(`${key}=${value}`);
  return lines.join('\n');
}

/** O que muda nos exemplos para a versão: só nomes e portas. Usuário, senha, loja e empresa ficam para a pessoa preencher. */
export function envOverridesFor(version: string): { wta: Record<string, string>; wsh: Record<string, string> } {
  const c = firstStepsContainers(version);
  return {
    wta: { DB_HOST: c.oracle },
    wsh: {
      WSH_CONTAINER: c.wsh,
      ORACLE_CONTAINER: c.oracle,
      WTA_CONTAINER: c.wta,
      DB_HOST: c.oracle,
      WTA_HOST: c.wta,
      SERVER_PORT: String(winthorVersionPorts(version).wsh)
    }
  };
}

export const WTA_INSTALLER_PATH = '/instalador';
