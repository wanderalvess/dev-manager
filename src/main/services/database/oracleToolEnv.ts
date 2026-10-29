import fs from 'fs';
import path from 'path';

/** Utilitários de linha de comando do Oracle que dependem do ORACLE_HOME para achar os arquivos de mensagem. */
const ORACLE_TOOLS = new Set(['exp', 'imp', 'expdp', 'impdp', 'sqlplus', 'sqlldr']);

export function isOracleTool(binary: string): boolean {
  const name = path.basename(binary).toLowerCase().replace(/\.exe$/, '');
  return ORACLE_TOOLS.has(name);
}

/** Procura o executável no PATH, como o execFile faria (no Windows, com as extensões do PATHEXT). */
export function resolveExecutable(binary: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const isWindows = process.platform === 'win32';
  const exts = isWindows
    ? ['', ...(env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean)]
    : [''];
  const candidates = (dir: string) => exts.map((ext) => path.join(dir, binary + ext));

  const exists = (file: string) => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  };

  if (path.isAbsolute(binary) || binary.includes('/') || binary.includes('\\')) {
    return candidates('').map((c) => path.resolve(c)).find(exists) ?? null;
  }

  const pathVar = env.PATH ?? env.Path ?? '';
  for (const dir of pathVar.split(path.delimiter).filter(Boolean)) {
    const found = candidates(dir).find(exists);
    if (found) return found;
  }
  return null;
}

/**
 * ORACLE_HOME de uma instalação completa do cliente/servidor: a pasta acima de `bin`
 * que contém `rdbms/mesg` (onde ficam os .msb do exp/expdp). Instant Client não tem
 * essa pasta e não precisa de ORACLE_HOME, então retorna null.
 */
export function deriveOracleHome(executablePath: string): string | null {
  const binDir = path.dirname(executablePath);
  if (path.basename(binDir).toLowerCase() !== 'bin') return null;
  const home = path.dirname(binDir);
  try {
    return fs.statSync(path.join(home, 'rdbms', 'mesg')).isDirectory() ? home : null;
  } catch {
    return null;
  }
}

/**
 * Ambiente para executar um utilitário Oracle. Sem ORACLE_HOME, o exp/expdp de uma
 * instalação completa falha com "Message 206 not found" / UDE-00019; aqui ele é
 * definido com o home do próprio executável, que tem precedência sobre um ORACLE_HOME
 * herdado que aponte para outra instalação.
 */
export function buildOracleToolEnv(
  binary: string,
  baseEnv: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const env = { ...baseEnv };
  const executable = resolveExecutable(binary, baseEnv);
  const home = executable ? deriveOracleHome(executable) : null;
  if (home) env.ORACLE_HOME = home;
  return env;
}

/** Saída típica do exp/expdp quando não acha os arquivos de mensagem (ORACLE_HOME ausente ou errado). */
export function isMissingOracleHomeOutput(output: string): boolean {
  return /No message file for product=|UDE-00019|ORACLE_HOME is properly set/i.test(output);
}

export function missingOracleHomeMessage(binary: string): string {
  const executable = resolveExecutable(binary);
  const where = executable ? ` (${executable})` : '';
  return (
    `${path.basename(binary)}${where} não encontrou os arquivos de mensagem do Oracle: o ORACLE_HOME não está definido ou aponta para outra instalação. ` +
    `Defina a variável de ambiente ORACLE_HOME com a pasta da instalação Oracle (a que contém bin\\ e rdbms\\mesg\\) e reinicie o Dev Manager, ` +
    `ou informe nas configurações o caminho completo do executável dentro dessa instalação.`
  );
}
