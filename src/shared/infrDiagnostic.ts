/**
 * Relatório para suporte: tudo o que ajuda a achar o problema de um ambiente do INFR-Docker num texto só, para copiar e
 * colar (ou mandar o arquivo), em vez de prints do terminal. Reúne a versão do Hub, a pasta do INFR-Docker (branch,
 * alterações locais e se cada script conhece as opções que o Hub passa), os arquivos de configuração, o Docker, o estado
 * e o log de cada container e o log da criação (os primeiros erros com contexto e o fim). Tudo passa pela máscara: senhas,
 * tokens, `usuário:senha@` em URL e cabeçalhos Authorization nunca saem na saída.
 */
import { isValidEnvName } from './infrWinthorVersion';

const SENSITIVE_KEY = /(PASS|PWD|SENHA|SECRET|TOKEN|KEY|CRED|AUTH)/i;

/** Esconde o que não pode sair da máquina num texto livre (logs, comandos, mensagens). */
export function maskDiagnostic(text: string): string {
  return text
    .replace(/(https?:\/\/)[^/@\s]+@/gi, '$1***@')
    .replace(/\b(authorization\s*:\s*(?:basic|bearer|token)\s+)\S+/gi, '$1***')
    // chave = valor, com a palavra sensível em qualquer ponto do nome (DB_PASSWORD=..., WTA_API_KEY: ..., senha: ...)
    // ("pass" e "token" só como palavra do nome: "passed: 5 tests" e "tokens: 120" não são segredo)
    .replace(/([\w.-]*(?:senha|password|passwd|pwd|token(?!s)|secret|api_?key|(?<![a-z])pass(?![a-z]))[\w.-]*)(\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1$2***')
    // opção de linha de comando: --senha x, --password=x, -p x do sqlplus/mysql não entra (só as de nome claro)
    .replace(/(--?(?:senha|password|passwd|pwd)(?:\s+|=))("[^"]*"|'[^']*'|\S+)/gi, '$1***')
    // usuário/senha@servico (conexão do Oracle); com o limite à esquerda e sem "@id=" para não estragar URL do Nexus
    .replace(/(^|[\s'"(=])([A-Za-z_][\w$#]{0,29})\/([^\s@/'"]+)@(?!id=)([\w.\-:/]+)/gm, '$1$2/***@$4');
}

/** Arquivo KEY=VALOR (wta.env, .env): o valor some quando a chave é de senha, token ou chave. */
export function maskEnvText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const m = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_.-]*)(\s*=\s*)(.*)$/.exec(line);
      if (!m) return maskDiagnostic(line);
      return SENSITIVE_KEY.test(m[2]) ? `${m[1]}${m[2]}${m[3]}***` : maskDiagnostic(line);
    })
    .join('\n');
}

/** Script (bash, na distro) que junta o que só a distro sabe: Docker, imagens, disco, memória e os logs. */
export function diagnosticProbeScript(name: string, logPath: string, dbUser?: string): string {
  if (!isValidEnvName(name)) return 'echo invalid-name';
  const n = name.trim();
  const roles = ['oracle', 'wta', 'wsh'];
  return [
    "echo '@@sistema'; uname -sr 2>&1; docker version --format 'Docker cliente {{.Client.Version}}, servidor {{.Server.Version}}' 2>&1 | head -3",
    "echo '@@imagens'; docker images --format '{{.Repository}}:{{.Tag}} | criada {{.CreatedSince}} | {{.Size}}' 2>/dev/null | grep -E '^(linux-winthor|oracle-winthor|wsh)' | head -30",
    "echo '@@disco'; df -h / /opt 2>/dev/null",
    "echo '@@memoria'; free -m 2>/dev/null | head -2",
    `echo '@@ps'; docker ps -a --filter name=-${n} --format '{{.Names}} | {{.Image}} | {{.Status}} | {{.Ports}}' 2>&1 | head -10`,
    ...roles.map((r) => `echo '@@c ${r}-${n}'; docker logs --tail 80 ${r}-${n} 2>&1 | tail -n 80 | cut -c1-400`),
    ...dbProbeLines(n, dbUser),
    `f='${logPath}'`,
    `echo '@@erros'; [ -f "$f" ] && grep -n -m3 -B3 -A2 -E '\\[ERRO\\]|ORA-[0-9]{5}|Unable to resolve|No matching features|Flag desconhecida|Could not resolve' "$f" | cut -c1-400`,
    `echo '@@log'; [ -f "$f" ] && tail -n 150 "$f" | cut -c1-600`,
    `echo '@@anterior'; [ -f "$f.prev" ] && tail -n 40 "$f.prev" | cut -c1-600`,
    "echo '@@fim'"
  ].join('\n');
}

const DB_USER = /^[A-Za-z][A-Za-z0-9_]{0,29}$/;

/**
 * Banco clonado da Central de Controle: objetos INVALID do schema do WTA e linhas de PCVERSAOBD com espaço no fim de
 * `rotina` (a 801 falha com "Falha na Atualização! '-1'" e todo DELETE em PCGRUPOSCAMPANHAI dá ORA-04098). Só leitura:
 * `sqlplus -S / as sysdba` como usuário oracle dentro do container, sem senha, como o restore_rman.sh faz.
 */
function dbProbeLines(name: string, dbUser?: string): string[] {
  if (!dbUser || !DB_USER.test(dbUser)) return ["echo '@@banco'; echo 'Não deu para ler o banco: o usuário do banco (DB_USER) não está no wta.env da versão'"];
  const u = dbUser.toUpperCase();
  const sql = [
    'set pagesize 0 feedback off heading off linesize 200 trimout on',
    `select 'INVALID ' || object_type || ' ' || object_name from dba_objects where owner = '${u}' and status = 'INVALID' and rownum <= 20;`,
    `select 'PCVERSAOBD [' || rotina || ']' from ${u}.pcversaobd where rotina like '% ' and rownum <= 20;`,
    'exit'
  ];
  const args = sql.map((l) => `"${l}"`).join(' ');
  // Dentro do container: o ORACLE_HOME e o SID que ele já define (XE 11g, 23ai Free...) valem; o do XE é só reserva. No 23ai
  // (SID FREE) o schema fica no PDB FREEPDB1, então a sessão entra nele antes das consultas
  const inside =
    'export ORACLE_HOME="${ORACLE_HOME:-/u01/app/oracle/product/11.2.0/xe}" ORACLE_SID="${ORACLE_SID:-XE}"; export PATH="$ORACLE_HOME/bin:$PATH"; ' +
    '{ [ "$ORACLE_SID" = FREE ] && echo "alter session set container = FREEPDB1;"; cat; } | sqlplus -S / as sysdba';
  return [
    "echo '@@banco'",
    `if [ -n "$(docker ps -q -f name=^oracle-${name}$)" ]; then`,
    `  out=$(printf '%s\\n' ${args} | docker exec -i -u oracle oracle-${name} bash -c '${inside}' 2>&1 | head -30 | cut -c1-300)`,
    `  echo "$out"; echo '@@bancoimg'; docker inspect -f '{{.Config.Image}}' oracle-${name} 2>/dev/null`,
    `else echo 'Não deu para ler o banco: oracle-${name} não está rodando'; fi`
  ];
}

/** sqlplus que não iniciou (home sem arquivo de mensagens, SID errado, banco fora do ar). */
const SQLPLUS_FAILED = /SP2-\d+|Error \d+ initializing SQL|ORA-(?:01034|01017|12\d{3}|65\d{3})/;

/**
 * Seção do banco já limpa: a saída crua do sqlplus quando não iniciou vira uma frase com a imagem do container; linhas
 * em branco saem. Vazio = o banco foi lido e não há nada inválido.
 */
export function normalizeBankProbe(lines: string[] | undefined, image?: string): string[] | undefined {
  if (!lines) return undefined;
  const clean = lines.map((l) => l.trimEnd()).filter((l) => l.trim());
  if (clean.some((l) => SQLPLUS_FAILED.test(l))) return [`Não deu para ler o banco: o sqlplus não iniciou nesta imagem (${image?.trim() || 'imagem desconhecida'})`];
  return clean;
}

/** Lê a saída do `diagnosticProbeScript`: seção → linhas (as de container ficam em `c <nome>`). */
export function parseDiagnosticProbe(output: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current = '';
  for (const raw of output.replace(/\r\n/g, '\n').split('\n')) {
    const m = /^@@([a-z]+(?: [\w.-]+)?)$/.exec(raw.trim());
    if (m) {
      current = m[1] === 'fim' ? '' : m[1];
      if (current) sections.set(current, []);
    } else if (current) sections.get(current)!.push(raw);
  }
  return sections;
}

export interface DiagnosticScript {
  script: string;
  path: string;
  exists: boolean;
  bytes?: number;
  modified?: string;
  /** Opções que o Hub passa e que o script não conhece */
  missing: string[];
}

export interface DiagnosticFile {
  label: string;
  exists: boolean;
  modified?: string;
  /** Conteúdo já mascarado (chaves e valores não sensíveis) */
  lines?: string[];
  note?: string;
}

export interface DiagnosticContainer {
  name: string;
  exists: boolean;
  state?: string;
  health?: string;
  restarts?: number;
  image?: string;
  ports: string[];
}

export interface DiagnosticInput {
  generatedAt: string;
  hubVersion: string;
  os: string;
  name: string;
  distro: string;
  infrPath: string;
  summary?: { status: string; title: string; detail: string };
  git?: { branch?: string; commit?: string; changes: string[]; error?: string };
  scripts: DiagnosticScript[];
  /** Mensagem do aviso de scripts desatualizados, quando há */
  gapsMessage?: string;
  files: DiagnosticFile[];
  containers: DiagnosticContainer[];
  probe: Map<string, string[]>;
  buildLog?: { path: string; failure?: string; stage?: string };
  /** O que o Hub registrou do lado dele: leitura da origem, mensagem da criação, comando */
  notes?: string;
}

const MAX_REPORT = 150000;

const block = (lines: string[] | undefined, empty = '(vazio)'): string => {
  const body = (lines ?? []).filter((l, i, all) => l.trim() || (i > 0 && i < all.length - 1)).join('\n').trimEnd();
  return `\`\`\`\n${body || empty}\n\`\`\``;
};

/** Alvo da versão para a IA: cabe no contexto de um modelo pequeno (Ollama) sem perder o que explica a falha. */
export const COMPACT_TARGET = 7000;

const clip = (lines: string[] | undefined, max: number, tail = false): string[] => {
  const all = (lines ?? []).map((l) => l.trimEnd()).filter((l) => l.trim());
  return tail ? all.slice(-max) : all.slice(0, max);
};

/** Corta cada linha e o total, mantendo as primeiras linhas (o começo do que importa). */
const fit = (lines: string[], maxChars: number, lineMax = 220): string[] => {
  const out: string[] = [];
  let used = 0;
  for (const raw of lines) {
    const l = raw.length > lineMax ? `${raw.slice(0, lineMax)}...` : raw;
    if (used + l.length + 1 > maxChars) break;
    out.push(l);
    used += l.length + 1;
  }
  return out;
};

/**
 * Versão compacta do relatório para a IA (alvo de 6 a 8 mil caracteres, nunca mais de 8 mil). Na ordem do que mais explica
 * uma falha: resumo, scripts desatualizados, pasta (branch/commit/alterações), containers, imagens, primeiros erros do
 * Gerar com contexto e o fim do log. Passa pela mesma máscara do relatório completo.
 */
export function buildCompactDiagnostic(i: DiagnosticInput): string {
  const p = (key: string) => (key === 'banco' ? normalizeBankProbe(i.probe.get('banco'), i.probe.get('bancoimg')?.[0]) : i.probe.get(key));
  const out: string[] = [`Estado do ambiente ${i.name} (Hub ${i.hubVersion}, distro ${i.distro}, lido em ${i.generatedAt})`];

  out.push(i.summary ? `Resumo: ${i.summary.status}: ${i.summary.title}. ${i.summary.detail}` : 'Resumo: o Hub não conseguiu resumir o estado do ambiente.');

  if (i.gapsMessage) out.push(`SCRIPTS DESATUALIZADOS: ${i.gapsMessage}`);
  else if (i.scripts.length) out.push('Scripts: todos conhecem as opções que o Hub passa.');
  for (const s of i.scripts) {
    if (!s.exists) out.push(`- ${s.path}: NÃO EXISTE`);
    else if (s.missing.length) out.push(`- ${s.path} (modificado ${s.modified ?? '?'}): não conhece ${s.missing.join(', ')}`);
  }

  if (i.git?.error && !i.git.branch) out.push(`Pasta do INFR-Docker (${i.infrPath}): git: ${i.git.error}`);
  else {
    out.push(`Pasta do INFR-Docker (${i.infrPath}): branch ${i.git?.branch ?? '?'}, commit ${i.git?.commit ?? '?'}${i.git?.error ? ' (commit e alterações sem leitura)' : ''}`);
    if (i.git?.changes.length) out.push(`Alterações locais (${i.git.changes.length}): ${i.git.changes.slice(0, 6).join(' | ')}`);
  }

  const missingFiles = i.files.filter((f) => !f.exists).map((f) => f.label);
  if (missingFiles.length) out.push(`Arquivos de configuração ausentes: ${missingFiles.join(', ')}`);

  out.push('Containers:');
  for (const c of i.containers) {
    out.push(c.exists ? `- ${c.name}: ${c.state ?? '?'}${c.health ? `/${c.health}` : ''}${c.restarts ? `, ${c.restarts} reinícios` : ''}, ${c.image ?? '?'}` : `- ${c.name}: não existe`);
    if (c.exists && (c.state !== 'running' || (c.health && c.health !== 'healthy'))) {
      out.push(...fit(clip(p(`c ${c.name}`), 6, true), 700).map((l) => `    log: ${l}`));
    }
  }

  const bank = clip(p('banco'), 12);
  if (p('banco')) out.push('Banco (somente leitura, schema do WTA):', ...(bank.length ? fit(bank, 900, 200) : ['Nenhum objeto inválido e nenhuma rotina de PCVERSAOBD com espaço no fim.']).map((l) => `  ${l}`));

  const images = fit(clip(p('imagens'), 6), 700);
  if (images.length) out.push('Imagens:', ...images.map((l) => `- ${l}`));

  if (i.buildLog) {
    out.push(`Log da criação: ${i.buildLog.stage ? `última etapa ${i.buildLog.stage}` : 'sem etapa'}${i.buildLog.failure ? `; falha: ${i.buildLog.failure}` : ''}`);
    const errors = fit(clip(p('erros'), 14), 1800, 260);
    out.push('Primeiros erros do log, com contexto:', ...(errors.length ? errors.map((l) => `  ${l}`) : ['  (nenhum [ERRO] ou ORA-)']));
    out.push('Fim do log:', ...fit(clip(p('log'), 22, true).reverse(), 2000, 220).reverse().map((l) => `  ${l}`));
  } else out.push('Não há log da criação deste ambiente nesta distro.');

  if (i.notes?.trim()) out.push('Registro do Hub:', ...fit(clip(i.notes.split('\n'), 8), 800, 260).map((l) => `  ${l}`));

  const text = maskDiagnostic(out.join('\n'));
  // Os blocos têm teto próprio; se ainda passar de 8 mil (nomes e mensagens enormes), mantém o começo e o fim
  return text.length <= 8000 ? text : `${text.slice(0, 5200)}\n[... cortado ...]\n${text.slice(-2600)}`;
}

/** O relatório em Markdown, já mascarado e com tamanho limitado. */
export function buildDiagnosticReport(i: DiagnosticInput): string {
  const p = (key: string) => (key === 'banco' ? normalizeBankProbe(i.probe.get('banco'), i.probe.get('bancoimg')?.[0]) : i.probe.get(key));
  const out: string[] = [];
  out.push(`# Relatório do Hub Manager: ambiente ${i.name}`);
  out.push(`Gerado em ${i.generatedAt} · Hub ${i.hubVersion} · ${i.os} · distro ${i.distro}`);

  out.push('', '## Resumo');
  out.push(i.summary ? `**${i.summary.status}**: ${i.summary.title}. ${i.summary.detail}` : 'O Hub não conseguiu resumir o estado do ambiente.');

  out.push('', '## Pasta do INFR-Docker', `Caminho: ${i.infrPath}`);
  if (i.git?.error && !i.git.branch) out.push(`Git: ${i.git.error}`);
  else {
    out.push(`Branch: ${i.git?.branch ?? '?'} · commit: ${i.git?.commit ?? '?'}`);
    if (i.git?.error) out.push(`Git: ${i.git.error} (a branch veio do .git/HEAD; commit e alterações locais ficaram sem leitura).`);
    else out.push(i.git?.changes.length ? `Alterações locais (${i.git.changes.length}):` : 'Sem alterações locais.');
    if (i.git?.changes.length) out.push(block(i.git.changes.slice(0, 25)));
  }

  out.push('', '## Scripts e as opções que o Hub passa');
  out.push(i.gapsMessage ? `**DESATUALIZADO**: ${i.gapsMessage}` : 'Todos os scripts conhecem as opções que o Hub passa.');
  out.push('| script | tamanho | modificado | opções que faltam |', '|---|---|---|---|');
  for (const s of i.scripts) {
    out.push(`| ${s.path} | ${s.exists ? `${s.bytes} B` : 'NÃO EXISTE'} | ${s.modified ?? '-'} | ${s.missing.length ? s.missing.join(', ') : 'nenhuma'} |`);
  }

  out.push('', '## Arquivos de configuração (valores de senha, token e chave escondidos)');
  for (const f of i.files) {
    out.push(`- ${f.label}: ${f.exists ? `existe${f.modified ? ` (modificado ${f.modified})` : ''}` : 'não existe'}${f.note ? `. ${f.note}` : ''}`);
    if (f.lines?.length) out.push(block(f.lines));
  }

  out.push('', '## Docker e máquina');
  out.push(block([...(p('sistema') ?? []), ...(p('disco') ?? []), ...(p('memoria') ?? [])]));
  out.push('Imagens do INFR-Docker:', block(p('imagens'), '(nenhuma)'));
  out.push('Containers deste ambiente (docker ps -a):', block(p('ps'), '(nenhum)'));

  if (p('banco')) out.push('', '## Banco (somente leitura)', block(p('banco'), 'Nenhum objeto inválido e nenhuma rotina de PCVERSAOBD com espaço no fim.'));

  out.push('', '## Containers');
  for (const c of i.containers) {
    out.push(
      c.exists
        ? `### ${c.name}: ${c.state}${c.health ? ` / ${c.health}` : ''}${c.restarts ? ` · ${c.restarts} reinícios` : ''} · ${c.image ?? '?'} · portas ${c.ports.join(', ') || '-'}`
        : `### ${c.name}: não existe`
    );
    if (c.exists) out.push(block(p(`c ${c.name}`), '(sem log)'));
  }

  out.push('', '## Log da criação');
  if (!i.buildLog) out.push('Não há log da criação deste ambiente nesta distro (a criação deste Hub ainda não rodou, ou o /tmp foi limpo).');
  else {
    out.push(`Arquivo: ${i.buildLog.path}${i.buildLog.stage ? ` · última etapa: ${i.buildLog.stage}` : ''}${i.buildLog.failure ? ` · falha: ${i.buildLog.failure}` : ''}`);
    out.push('Primeiros erros, com contexto:', block(p('erros'), '(nenhum [ERRO], ORA- ou erro de resolução)'));
    out.push('Fim do log (150 linhas):', block(p('log'), '(vazio)'));
    if (p('anterior')?.some((l) => l.trim())) out.push('Criação anterior (fim do log, 40 linhas):', block(p('anterior')));
  }

  if (i.notes?.trim()) out.push('', '## Registro do Hub', block(i.notes.split('\n')));

  const text = maskDiagnostic(out.join('\n'));
  if (text.length <= MAX_REPORT) return text;
  return `${text.slice(0, 60000)}\n\n[... relatório cortado: ${text.length - 150000} caracteres do meio ...]\n\n${text.slice(-90000)}`;
}
