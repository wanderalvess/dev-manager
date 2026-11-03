/**
 * O new_version_env.sh roda no terminal do Windows; a saída dele também vai para um arquivo da distro
 * (`/tmp/hub-nova-versao-<nome>.log`). Depois do Gerar, o Verificar ambiente lê o fim desse arquivo e, se o build
 * falhou, mostra o motivo no lugar de 300 linhas no terminal.
 *
 * Num build que falha ao instalar as features, o fim do log é só consequência (uma linha `[ERRO] ... não ficou instalada`
 * por feature, 151 numa lista de 140): a causa é o PRIMEIRO erro de resolução do lote, que fica no meio do arquivo.
 * Por isso a leitura também procura esse erro no arquivo inteiro e o resumo mostra ele, completo.
 */
import { isValidEnvName } from './infrWinthorVersion';

export const buildLogPath = (name: string): string | null => (isValidEnvName(name) ? `/tmp/hub-nova-versao-${name.trim()}.log` : null);

/** A primeira falha de resolução do build, destrinchada. */
export interface BuildLogCause {
  /** Uma frase com o que não resolveu (sem cortar no meio) */
  headline: string;
  /** O que faltou, uma frase por item (feature/bundle e versão, pacote e faixa) */
  requirements: string[];
  /** A cadeia `caused by` do Karaf, sem cortar no meio */
  causedBy: string[];
  /** Quantas linhas `[ERRO]` o log tem: quase todas são consequência da primeira */
  symptoms: number;
  /** `N falha(s) ao aplicar ...` do script de instalação, quando houver */
  failures?: number;
  /** Outros problemas independentes do mesmo log (feature que nenhum repositório da lista tem), além da causa */
  others?: string[];
  /** Como resolver, quando a causa é conhecida */
  hint?: string;
  /** Texto da primeira falha como o Karaf escreveu, para ler inteiro e copiar */
  full: string;
}

export interface BuildLogReport {
  path: string;
  /** Existe o arquivo (o Gerar já foi feito por este Hub nesta distro) */
  exists: boolean;
  /** Uma causa conhecida de falha achada no log */
  failure?: string;
  /** A primeira falha de resolução do lote, completa (só quando o log tem uma) */
  cause?: BuildLogCause;
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

/** Corta em uma palavra inteira, para não deixar "Unable to resolve w" no resumo. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40))}…`;
}

/** Tira o que o Docker e o script põem na frente (`#8 238.5 [09:00:36] [ERRO] `). */
const stripLinePrefix = (line: string) => line.replace(/^#\d+\s+[\d.]+\s+/, '').replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').replace(/^\[ERRO\]\s*/i, '').trim();

/**
 * Destrincha a primeira falha de resolução: o que faltou (feature ou bundle com a faixa de versão; pacote com a faixa),
 * a cadeia `caused by` e, quando dá, o que fazer. `lines` são as primeiras linhas de resolução do log, na ordem do arquivo.
 */
export function extractBuildCause(lines: string[], symptoms: number, failures?: number): BuildLogCause | undefined {
  const clean = lines.map((l) => stripLinePrefix(l.replace(ANSI, ''))).filter(Boolean);
  if (clean.length === 0) return undefined;
  // A causa é a primeira falha do lote; as seguintes só entram em `others` (outros problemas independentes, como feature sem repositório)
  const full = clean[0];
  const text = full;

  const requirements: string[] = [];
  const add = (s: string) => {
    if (!requirements.includes(s)) requirements.push(s);
  };
  for (const m of text.matchAll(/osgi\.identity=([\w.-]+);\s*type=(karaf\.feature|osgi\.bundle)[^"\n]*?version="([^"]+)"/g)) {
    add(`${m[2] === 'karaf.feature' ? 'feature' : 'bundle'} ${m[1]} na versão ${m[3]}`);
  }
  for (const m of text.matchAll(/\(osgi\.wiring\.package=([\w.]+)\)\(version>=([\d.]+)\)(?:\(!\(version>=([\d.]+)\)\))?/g)) {
    add(`pacote ${m[1]} em [${m[2]}, ${m[3] ?? '∞'})`);
  }
  const noMatch = [...text.matchAll(/No matching features for ([\w.-]+\/[\w.]+)/g)].map((m) => m[1]);
  for (const f of noMatch) add(`feature ${f} não existe em nenhum repositório da lista`);

  const others: string[] = [];
  for (const line of clean.slice(1)) {
    for (const m of line.matchAll(/No matching features for ([\w.-]+\/[\w.]+)/g)) {
      const s = `feature ${m[1]} não existe em nenhum repositório da lista`;
      if (!others.includes(s) && !requirements.includes(s)) others.push(s);
    }
  }

  const causedBy: string[] = [];
  for (const part of full.split(/\[caused by:\s*/i).slice(1)) {
    const c = clip(part.replace(/\]\s*$/, '').trim(), 400);
    if (c && !causedBy.includes(c)) causedBy.push(c);
    if (causedBy.length >= 3) break;
  }

  const first = requirements[0] ?? clip(full, 160);
  const headline = noMatch.length > 0 && !/Unable to resolve/i.test(full) ? requirements[0] ?? first : `não resolveu ${first}`;
  const hint =
    noMatch.length > 0
      ? `A feature ${noMatch[0]} não está em nenhum repositório da lista: falta a linha "repo mvn:..." dela no manifesto, ou o artefato não foi publicado no Nexus. Confira o manifesto e o Nexus.`
      : requirements.some((r) => r.startsWith('pacote'))
        ? 'Uma feature da lista exige um pacote numa versão que as outras não fornecem (em geral, uma feature que ficou na versão anterior convive com outras que subiram). Veja as features que ficaram atrás na revisão e rode o ensaio no Karaf de origem antes de gerar.'
        : /Unable to resolve root/i.test(full)
          ? 'Uma feature da lista não se resolve com as demais (versão que falta ou conflito de versões). Veja as features que ficaram atrás na revisão e rode o ensaio no Karaf de origem antes de gerar.'
          : undefined;

  return {
    headline,
    requirements: requirements.slice(0, 6),
    causedBy,
    symptoms,
    ...(failures !== undefined ? { failures } : {}),
    ...(others.length > 0 ? { others: others.slice(0, 5) } : {}),
    ...(hint ? { hint } : {}),
    full: clip(full, 6000)
  };
}

/**
 * Script (bash, na distro) que lê o log do build: o fim do arquivo e, do arquivo inteiro, as primeiras falhas de resolução,
 * quantas linhas `[ERRO]` há e o total que o script de instalação informou.
 */
export function buildLogProbeScript(path: string): string {
  return [
    `f='${path}'`,
    `if [ ! -f "$f" ]; then echo '@@semlog'; exit 0; fi`,
    "echo '@@tail'; tail -n 200 \"$f\"",
    "echo '@@causa'; grep -m4 -E 'Unable to resolve root|No matching features|Could not resolve' \"$f\" | cut -c1-6000",
    "echo '@@erros'; grep -c '\\[ERRO\\]' \"$f\"",
    "echo '@@falhas'; grep -m1 -E '[0-9]+ falha\\(s\\)' \"$f\" | cut -c1-300"
  ].join('\n');
}

/** Lê a saída do `buildLogProbeScript`; undefined quando o arquivo não existe. */
export function parseBuildLogProbe(path: string, output: string): BuildLogReport | undefined {
  const text = output.replace(/\r\n/g, '\n');
  if (text.trim() === '@@semlog') return undefined;
  const sections = new Map<string, string[]>();
  let current = '';
  for (const line of text.split('\n')) {
    const m = /^@@(tail|causa|erros|falhas)$/.exec(line.trim());
    if (m) {
      current = m[1];
      sections.set(current, []);
    } else if (current) sections.get(current)!.push(line);
  }
  // Saída sem seções: o fim do log como veio (formato antigo)
  if (sections.size === 0) return analyzeBuildLog(path, text);
  const report = analyzeBuildLog(path, (sections.get('tail') ?? []).join('\n'));
  const symptoms = parseInt((sections.get('erros') ?? ['0'])[0].trim(), 10) || 0;
  const failures = /(\d+)\s+falha\(s\)/.exec((sections.get('falhas') ?? []).join(' '))?.[1];
  const cause = extractBuildCause((sections.get('causa') ?? []).filter((l) => l.trim()), symptoms, failures ? parseInt(failures, 10) : undefined);
  return cause ? { ...report, cause, failure: `${cause.headline}${cause.causedBy[0] ? ` (causa: ${cause.causedBy[0]})` : ''}` } : report;
}
