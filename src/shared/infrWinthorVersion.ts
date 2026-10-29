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

/** Comando rodado em `wsh-winthor`: com versão, usa o `.env.<versão>` (jar e portas daquela versão). */
export function buildWshSetupCommand(version?: string): string {
  return isValidWinthorVersion(version) ? `./wsh_setup.sh .env.${version.trim()}` : './wsh_setup.sh';
}
