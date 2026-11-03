/**
 * O new_version_env.sh roda no terminal do Windows; a saída dele também vai para um arquivo da distro
 * (`/tmp/hub-nova-versao-<nome>.log`). Depois do Gerar, o Verificar ambiente lê o fim desse arquivo e, se o build
 * falhou, mostra o motivo no lugar de 300 linhas no terminal.
 */
import { isValidEnvName } from './infrWinthorVersion';

export const buildLogPath = (name: string): string | null => (isValidEnvName(name) ? `/tmp/hub-nova-versao-${name.trim()}.log` : null);

export interface BuildLogReport {
  path: string;
  /** Existe o arquivo (o Gerar já foi feito por este Hub nesta distro) */
  exists: boolean;
  /** Uma causa conhecida de falha achada no fim do log */
  failure?: string;
  /** Última linha com cara de etapa do script (`[1/5]`, `==>`, `Step`) */
  stage?: string;
  tail: string[];
}

// eslint-disable-next-line no-control-regex -- cores ANSI que os scripts imprimem
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

const FAILURES: RegExp[] = [
  /Unable to resolve[^\n]*/i,
  /missing requirement[^\n]*/i,
  /Could not (?:resolve|transfer|find artifact)[^\n]*/i,
  /(?:Connection (?:refused|timed out)|Temporary failure in name resolution|no such host)[^\n]*/i,
  /no space left on device[^\n]*/i,
  /port is already allocated[^\n]*/i,
  /pull access denied[^\n]*/i,
  /ORA-\d{5}[^\n]*/,
  /\[ERRO\][^\n]*/i,
  /^ERROR[: ][^\n]*/m
];

export function analyzeBuildLog(path: string, text: string | null): BuildLogReport {
  if (text === null || !text.trim()) return { path, exists: text !== null, tail: [] };
  const lines = text.replace(ANSI, '').split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  const tail = lines.slice(-40);
  const joined = tail.join('\n');
  let failure: string | undefined;
  for (const re of FAILURES) {
    const m = re.exec(joined);
    if (m) {
      failure = m[0].trim().slice(0, 300);
      break;
    }
  }
  const stage = [...lines].reverse().find((l) => /^(\[\d+\/\d+\]|==>|Step \d+\/\d+|#\d+ \[)/.test(l.trim()));
  return { path, exists: true, failure, stage: stage?.trim().slice(0, 160), tail };
}
