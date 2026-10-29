/**
 * Configuração do WTA (`wta.env.<versão>`) e do WSH (`.env.<versão>`) de um ambiente novo, partindo
 * dos valores do container de origem. Senhas nunca voltam para a tela: o campo vem vazio com
 * `hasValue`, e vazio na gravação quer dizer "mantém o valor da origem", lido no servidor.
 */

export type InfrEnvTarget = 'wta' | 'wsh';

export interface InfrEnvField {
  key: string;
  label: string;
  hint?: string;
  value: string;
  secret: boolean;
  /** Secreto com valor na origem (o valor não vem para a tela) */
  hasValue?: boolean;
  /** Definido pelo ambiente novo (banco, WTA, portas): não editável aqui */
  locked?: boolean;
}

interface FieldSpec {
  key: string;
  label: string;
  hint?: string;
}

const WTA_FIELDS: FieldSpec[] = [
  { key: 'DB_SID', label: 'SID / service do banco', hint: 'XE no Oracle 11g XE' },
  { key: 'DB_USER', label: 'Usuário do banco' },
  { key: 'DB_PASSWORD', label: 'Senha do banco', hint: 'Em maiúsculas se o Winthor.ini foi gerado assim' },
  { key: 'WTA_LOJA', label: 'Loja (schema)' },
  { key: 'WTA_EMPRESA', label: 'Empresa (alias)' },
  { key: 'WTA_JAVA_OPTS', label: 'Memória da JVM do Karaf', hint: '-Xms1g -Xmx4g; 2g para várias versões juntas' }
];

const WSH_FIELDS: FieldSpec[] = [
  { key: 'DB_SID', label: 'SID / service do banco' },
  { key: 'DB_USER', label: 'Usuário do banco' },
  { key: 'DB_PASSWORD', label: 'MD5 da senha (maiúsculo)', hint: 'echo -n "SENHA" | md5sum | tr a-f A-F' },
  { key: 'JVM_XMS', label: 'Memória inicial (JVM_XMS)' },
  { key: 'JVM_XMX', label: 'Memória máxima (JVM_XMX)' },
  { key: 'WTA_PORT', label: 'Porta interna do WTA', hint: '8080 dentro do container' },
  { key: 'WTA_LEGACY_PORT', label: 'Porta legada das rotas', hint: '8099 da instalação Windows original' },
  { key: 'WINTHOR_INI', label: 'Winthor.ini (caminho no WSL)', hint: 'Senha em maiúsculas' }
];

const SECRET = /PASS|SENHA|SECRET|TOKEN/i;
const SAFE_VALUE = /^[^\r\n\0]*$/;

export function isSecretEnvKey(key: string): boolean {
  return SECRET.test(key);
}

/** Linhas `KEY=valor` (saída de `docker inspect` ou de um .env) em mapa; comentários ignorados. */
export function parseEnvLines(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
  }
  return env;
}

/** Campos editáveis para a tela, com os valores da origem (segredos sem o valor). */
export function envFieldsFor(target: InfrEnvTarget, origin: Record<string, string>): InfrEnvField[] {
  const specs = target === 'wta' ? WTA_FIELDS : WSH_FIELDS;
  return specs.map((spec) => {
    const secret = isSecretEnvKey(spec.key);
    const value = origin[spec.key] ?? '';
    return secret ? { ...spec, value: '', secret, hasValue: value !== '' } : { ...spec, value, secret };
  });
}

/**
 * Conteúdo do .env do ambiente novo: parte da origem, aplica o que o usuário editou (segredo vazio
 * mantém o da origem) e por cima o que o ambiente novo define (banco, WTA, portas). Recusa valor
 * com quebra de linha, que injetaria outra variável no arquivo.
 */
export function buildEnvFile(
  origin: Record<string, string>,
  edits: Record<string, string>,
  fixed: Record<string, string>,
  header: string
): string {
  const env: Record<string, string> = { ...origin };
  for (const [key, value] of Object.entries(edits)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || !SAFE_VALUE.test(value)) throw new Error(`Valor inválido em ${key}.`);
    if (isSecretEnvKey(key) && value === '') continue;
    env[key] = value;
  }
  Object.assign(env, fixed);
  return [`# ${header}`, ...Object.entries(env).map(([k, v]) => `${k}=${v}`), ''].join('\n');
}

/** Só as variáveis que pertencem ao .env de cada um (o container traz PATH, JAVA_HOME etc.). */
export function pickEnv(target: InfrEnvTarget, env: Record<string, string>): Record<string, string> {
  const keep = target === 'wta' ? /^(DB_|WTA_)/ : /^(DB_|JVM_|WTA_PORT$|WTA_LEGACY_PORT$|WINTHOR_INI$)/;
  return Object.fromEntries(Object.entries(env).filter(([k]) => keep.test(k)));
}
