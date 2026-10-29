/**
 * Leitura dos arquivos de configuração do Karaf (.cfg / .properties do etc/, scripts do bin/ e o .conf do yajsw).
 * Funções puras sobre o texto; quem lê o disco é `services/karaf/karafInstallInfo.ts`.
 */

/** Formato .properties: `chave = valor` ou `chave=valor`, comentários com # ou !, linha que termina em \ continua na próxima. */
export function parseProperties(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  let pending = '';
  for (const rawLine of text.split(/\r?\n/)) {
    const line = pending ? pending + rawLine.trimStart() : rawLine;
    const trimmed = line.trim();
    if (!pending && (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!'))) continue;
    const backslashes = /\\+$/.exec(trimmed)?.[0].length ?? 0;
    if (backslashes % 2 === 1) {
      pending = trimmed.slice(0, -1);
      continue;
    }
    pending = '';
    const match = /^([^=:\s]+)\s*[=:]\s*(.*)$/.exec(trimmed);
    if (match) result[match[1]] = match[2].replace(/\\\\/g, '\\').trim();
  }
  return result;
}

/** Troca ${karaf.home}, ${karaf.base}, ${karaf.data} e ${karaf.etc} pela pasta da instalação. */
export function resolveKarafVars(value: string, root: string): string {
  const sep = root.includes('\\') ? '\\' : '/';
  const vars: Record<string, string> = {
    'karaf.home': root,
    'karaf.base': root,
    'karaf.data': `${root}${sep}data`,
    'karaf.etc': `${root}${sep}etc`
  };
  const resolved = value.replace(/\$\{([^}]+)\}/g, (whole, name: string) => vars[name] ?? whole);
  return sep === '\\' ? resolved.replace(/\//g, '\\') : resolved;
}

export const toPort = (value: string | undefined): number | undefined => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
};

/** Arquivo do log principal: log4j2 (Karaf 4.1+, `log4j2.appender.rolling.fileName`) ou log4j 1 (`log4j.appender.out.file`). */
export function logFileFromPaxLogging(props: Record<string, string>, root: string): string | undefined {
  const raw = props['log4j2.appender.rolling.fileName'] ?? props['log4j.appender.out.file'];
  return raw ? resolveKarafVars(raw, root) : undefined;
}

/** `set JAVA_HOME=C:\...` fixado num .bat (o winthor.bat traz o JDK do instalador). */
export function javaHomeFromBat(text: string): string | undefined {
  const match = /^\s*set\s+"?JAVA_HOME=([^"\r\n]+)"?\s*$/im.exec(text);
  const value = match?.[1].trim();
  return value && !value.includes('%') ? value : undefined;
}

/** Nome do serviço Windows do wrapper yajsw (`wrapper.ntservice.name`). */
export function serviceFromWrapperConf(props: Record<string, string>): { name: string; displayName?: string } | undefined {
  const name = props['wrapper.ntservice.name']?.trim();
  if (!name) return undefined;
  const displayName = props['wrapper.ntservice.displayname']?.trim();
  return { name, ...(displayName ? { displayName } : {}) };
}
