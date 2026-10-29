/**
 * Versão do WinThor nos scripts do INFR-Docker (imagem do WTA por versão).
 *
 * Com a versão informada, o WTA sobe da imagem `linux-winthor:<versão>-<distro>`, gerada pelo
 * `build_version.sh` a partir do manifesto `linux-winthor/versions/<versão>.features`. As portas
 * do host derivam da versão para que 38, 39 e 40 rodem lado a lado sem colidir.
 */

export interface WinthorVersionPorts {
  oracle: number;
  web: number;
  ssh: number;
  jmx: number;
  jms: number;
  wsh: number;
}

const VERSION_PATTERN = /^\d{2,3}$/;
const SAFE_NAME = /^[a-zA-Z0-9_.-]+$/;

export const INFR_DEFAULT_DISTRO = 'debian';

/** Versão do WinThor aceita nos scripts: só dígitos (38, 39, 40, 100...). */
export function isValidWinthorVersion(version: string | undefined): version is string {
  return typeof version === 'string' && VERSION_PATTERN.test(version.trim());
}

/**
 * Portas do host por versão: 38 → Oracle 1538, WTA 8038, SSH 8138, JMX 1038, Artemis 61638, WSH 9038.
 * Cada versão tem o seu banco (oracle-38), então o Oracle também ganha porta própria.
 */
export function winthorVersionPorts(version: string): WinthorVersionPorts {
  const n = parseInt(version, 10);
  return { oracle: 1500 + n, web: 8000 + n, ssh: 8100 + n, jmx: 1000 + n, jms: 61600 + n, wsh: 9000 + n };
}

/** Container e porta sugeridos para a versão (ex.: wta-38 na 8038). */
export function winthorVersionDefaults(version: string): { container: string; port: number } {
  return { container: `wta-${version}`, port: winthorVersionPorts(version).web };
}

/** Banco da versão: cada uma roda com o seu Oracle (ex.: oracle-38 na 1538). */
export function winthorVersionOracleDefaults(version: string): { container: string; port: number } {
  return { container: `oracle-${version}`, port: winthorVersionPorts(version).oracle };
}

/**
 * O usuário ainda não personalizou o container: pode ser trocado ao mudar a versão.
 * Vale para o nome padrão e para um nome gerado por outra versão (wta-39 → wta-40).
 */
export function isAutoWtaContainerName(name: string, defaultName: string): boolean {
  return isAutoVersionedName(name, defaultName, 'wta');
}

/** Mesmo critério de {@link isAutoWtaContainerName} para o container do Oracle (oracle-38). */
export function isAutoVersionedName(name: string, defaultName: string, prefix: string): boolean {
  const trimmed = name.trim();
  return trimmed === '' || trimmed === defaultName || new RegExp(`^${prefix}-\\d{2,3}$`).test(trimmed);
}

interface WtaSetupCommandInput {
  container: string;
  port: number;
  version?: string;
  distro?: string;
}

/**
 * Comando rodado em `linux-winthor/scripts`. Com versão, gera a imagem antes se ela ainda não
 * existir (o build instala as features pelo Nexus e pode levar alguns minutos).
 */
export function buildWtaSetupCommand({ container, port, version, distro = INFR_DEFAULT_DISTRO }: WtaSetupCommandInput): string {
  const base = `./wta_setup.sh --container ${container} --port ${port}`;
  if (!isValidWinthorVersion(version)) return base;
  const v = version.trim();
  const d = SAFE_NAME.test(distro) ? distro : INFR_DEFAULT_DISTRO;
  const ports = winthorVersionPorts(v);
  const image = `linux-winthor:${v}-${d}`;
  return (
    `(docker image inspect ${image} >/dev/null 2>&1 || ./build_version.sh ${v} ${d}) && ` +
    `${base} --version ${v} --distro ${d} --ssh-port ${ports.ssh} --jmx-port ${ports.jmx} --jms-port ${ports.jms}`
  );
}

const ENV_NAME = /^[a-zA-Z0-9_.-]{1,40}$/;
const WSL_FILE = /^\/[a-zA-Z0-9_./-]+$/;

/** Nome de ambiente aceito nos scripts (master, develop, suport...): vira sufixo dos containers. */
export function isValidEnvName(name: string | undefined): name is string {
  return typeof name === 'string' && ENV_NAME.test(name.trim());
}

export type InfrDbMode = 'clone' | 'existing' | 'empty';

export interface NewVersionEnvInput {
  version?: string;
  name?: string;
  from?: string;
  wshJar?: string;
  /** clone: RMAN de dbSource em dbContainer; existing: usa dbContainer; empty: dbContainer vazio */
  dbMode?: InfrDbMode;
  dbSource?: string;
  dbContainer?: string;
  wtaFrom?: string;
  wshFrom?: string;
  oraclePort?: number;
  wtaPort?: number;
  wshPort?: number;
}

const validPort = (p: number | undefined) => p === undefined || (Number.isInteger(p) && p > 0 && p <= 65535);

/**
 * Comando rodado em `linux-winthor/scripts` que monta o ambiente novo de uma versão a partir de
 * outro (imagem, banco, wta.env/.env da versão, WTA e WSH). Só vão as opções que o usuário mudou
 * do padrão do script. Null se algo for inválido.
 */
export function buildNewVersionEnvCommand(input: NewVersionEnvInput): string | null {
  const { version, name, from, wshJar, dbMode = 'clone' } = input;
  if (!isValidWinthorVersion(version) || !isValidEnvName(name) || !isValidEnvName(from)) return null;
  if (name.trim() === from.trim()) return null;
  if (!['clone', 'existing', 'empty'].includes(dbMode)) return null;
  const jar = wshJar?.trim();
  if (jar && !WSL_FILE.test(jar)) return null;
  const containers = [input.dbSource, input.dbContainer, input.wtaFrom, input.wshFrom].map((c) => c?.trim());
  if (containers.some((c) => c && !ENV_NAME.test(c))) return null;
  if (![input.oraclePort, input.wtaPort, input.wshPort].every(validPort)) return null;
  const [dbSource, dbContainer, wtaFrom, wshFrom] = containers;
  const opt = (flag: string, value: string | number | undefined) => (value ? ` ${flag} ${value}` : '');
  return (
    `./new_version_env.sh --version ${version.trim()} --name ${name.trim()} --from ${from.trim()}` +
    (dbMode !== 'clone' ? ` --db-mode ${dbMode}` : '') +
    opt('--db-source', dbMode === 'clone' ? dbSource : undefined) +
    opt('--db-container', dbContainer) +
    opt('--wta-from', wtaFrom) +
    opt('--wsh-from', wshFrom) +
    opt('--oracle-port', input.oraclePort) +
    opt('--wta-port', input.wtaPort) +
    opt('--wsh-port', input.wshPort) +
    opt('--wsh-jar', jar)
  );
}

export interface InfrContainerInfo {
  name: string;
  image: string;
  state: string;
  ports: string;
}

export interface InfrEnvironment {
  name: string;
  oracle?: InfrContainerInfo;
  wta?: InfrContainerInfo;
  wsh?: InfrContainerInfo;
}

/** O que existe na distro para montar uma versão nova: ambientes, Oracles e jars do WSH em /opt. */
export interface InfrEnvironmentsResult {
  success: boolean;
  error?: string;
  distro?: string;
  environments: InfrEnvironment[];
  oracles: InfrContainerInfo[];
  wshJars: string[];
}

/**
 * Ambientes da distro pelo padrão de nome <tipo>-<ambiente> (oracle-master, wta-master, wsh-master),
 * a partir de linhas `nome|imagem|estado|portas` do `docker ps -a`. Também devolve todos os Oracles
 * (pelo nome ou pela imagem), para escolher um banco que não siga o padrão.
 */
export function groupInfrEnvironments(lines: string[]): { environments: InfrEnvironment[]; oracles: InfrContainerInfo[] } {
  const byName = new Map<string, InfrEnvironment>();
  const oracles: InfrContainerInfo[] = [];
  for (const line of lines) {
    const [name, image = '', state = '', ports = ''] = line.trim().split('|');
    if (!name) continue;
    const info = { name, image, state, ports };
    if (/oracle/i.test(name) || /oracle/i.test(image)) oracles.push(info);
    const m = /^(oracle|wta|wsh)-(.+)$/.exec(name);
    if (!m) continue;
    const env = byName.get(m[2]) ?? { name: m[2] };
    env[m[1] as 'oracle' | 'wta' | 'wsh'] = info;
    byName.set(m[2], env);
  }
  const environments = [...byName.values()].filter((e) => e.wta).sort((a, b) => a.name.localeCompare(b.name));
  return { environments, oracles: oracles.sort((a, b) => a.name.localeCompare(b.name)) };
}

/** Comando rodado em `wsh-winthor`: com versão, usa o `.env.<versão>` (jar e portas daquela versão). */
export function buildWshSetupCommand(version?: string): string {
  return isValidWinthorVersion(version) ? `./wsh_setup.sh .env.${version.trim()}` : './wsh_setup.sh';
}
