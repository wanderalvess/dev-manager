/**
 * Os scripts do INFR-Docker da pasta da pessoa conhecem as opções que o Hub vai passar? Uma pasta numa branch antiga
 * (sem a imagem por versão) recusa `--version` com "[ERRO] Flag desconhecida" só depois de abrir o terminal. Aqui o
 * Hub lê o comando que vai rodar, acha cada `./script.sh --opção` e confere no texto do script, antes de abrir nada.
 */

/** Onde fica cada script, a partir da raiz do INFR-Docker. */
export const INFR_SCRIPT_PATHS: Record<string, string> = {
  'wta_setup.sh': 'linux-winthor/scripts/wta_setup.sh',
  'build_version.sh': 'linux-winthor/scripts/build_version.sh',
  'new_version_env.sh': 'linux-winthor/scripts/new_version_env.sh',
  'oracle_setup.sh': 'oracle-winthor/oracle_setup.sh',
  'wsh_setup.sh': 'wsh-winthor/wsh_setup.sh',
  'restore_rman.sh': 'oracle-winthor/11.2.0.2-xe/tools/restore_rman.sh',
  'bkp_rman.sh': 'oracle-winthor/11.2.0.2-xe/tools/bkp_rman.sh'
};

/** O que o new_version_env.sh chama por dentro: o terminal falharia no meio se estes não conhecessem as opções. */
const NESTED: Record<string, { script: string; flags: string[] }[]> = {
  'new_version_env.sh': [
    { script: 'wta_setup.sh', flags: ['--container', '--port', '--version', '--distro', '--ssh-port', '--jmx-port', '--jms-port'] },
    { script: 'build_version.sh', flags: [] },
    { script: 'oracle_setup.sh', flags: ['--container', '--port'] },
    { script: 'bkp_rman.sh', flags: ['--container'] },
    { script: 'restore_rman.sh', flags: ['--origem', '--destino', '--usuario', '--senha'] },
    { script: 'wsh_setup.sh', flags: [] }
  ]
};

export interface ScriptRequirement {
  script: string;
  flags: string[];
}

/** Scripts e opções que um comando do Hub usa (`./wta_setup.sh --container x --version 40` → wta_setup.sh e as opções). */
export function scriptRequirements(command: string): ScriptRequirement[] {
  const byScript = new Map<string, Set<string>>();
  const add = (script: string, flags: string[]) => {
    const set = byScript.get(script) ?? new Set<string>();
    flags.forEach((f) => set.add(f));
    byScript.set(script, set);
  };
  for (const segment of command.split(/&&|\|\||;|\(|\)|\|/)) {
    const tokens = segment.trim().split(/\s+/);
    const m = /^\.\/([\w.-]+\.sh)$/.exec(tokens[0] ?? '');
    if (!m || !INFR_SCRIPT_PATHS[m[1]]) continue;
    add(m[1], tokens.filter((t) => /^--[a-z][\w-]*$/.test(t)));
    for (const n of NESTED[m[1]] ?? []) add(n.script, n.flags);
  }
  return [...byScript].map(([script, flags]) => ({ script, flags: [...flags] }));
}

/** A opção aparece como caso do `case "$1" in` do script (`--version)` ou `--version|-v)`). */
export function scriptKnowsFlag(text: string, flag: string): boolean {
  const f = flag.replace(/[-]/g, '\\-');
  return new RegExp(`(^|[\\s|(])${f}(\\)|\\|)`, 'm').test(text);
}

export interface ScriptGap {
  script: string;
  path: string;
  /** O arquivo não existe na pasta */
  absent?: boolean;
  missing: string[];
}

/** O que falta nos scripts da pasta; `read` devolve o texto do arquivo (caminho relativo à raiz) ou null se não existir. */
export function scriptGaps(command: string, read: (relPath: string) => string | null): ScriptGap[] {
  const gaps: ScriptGap[] = [];
  for (const r of scriptRequirements(command)) {
    const path = INFR_SCRIPT_PATHS[r.script];
    const text = read(path);
    if (text === null) gaps.push({ script: r.script, path, absent: true, missing: [] });
    else {
      const missing = r.flags.filter((f) => !scriptKnowsFlag(text, f));
      if (missing.length) gaps.push({ script: r.script, path, missing });
    }
  }
  return gaps;
}

/** Mensagem para a pessoa, com o que falta e como atualizar a pasta. */
export function scriptGapsMessage(gaps: ScriptGap[], infrWindowsPath: string): string {
  const what = gaps.map((g) => (g.absent ? `${g.path} não existe` : `${g.path} não conhece ${g.missing.join(', ')}`)).join('; ');
  return (
    `Os scripts do INFR-Docker em ${infrWindowsPath} estão desatualizados: ${what}. O terminal pararia em "Flag desconhecida". ` +
    `Como resolver: atualize a pasta para a branch com a imagem por versão (hoje feature/imagem-por-versao): ` +
    `git fetch origin && git checkout feature/imagem-por-versao && git pull, dentro de ${infrWindowsPath}.`
  );
}
