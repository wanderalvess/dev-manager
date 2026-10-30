/**
 * Scripts do INFR-Docker que a Nova versão usa. Hoje só existem no branch `feature/imagem-por-versao`;
 * uma pasta no `main` tem só os de montar do zero (build.sh, run.sh, wta_setup.sh).
 */
export const INFR_NEW_VERSION_SCRIPTS = [
  'linux-winthor/scripts/export_features.sh',
  'linux-winthor/scripts/build_version.sh',
  'linux-winthor/scripts/new_version_env.sh'
] as const;

export const INFR_NEW_VERSION_BRANCH = 'feature/imagem-por-versao';

/** Mensagem com o "Como resolver" quando a pasta do INFR-Docker não tem os scripts da Nova versão. */
export function missingNewVersionScriptsMessage(folder: string, missing: string[]): string {
  const names = missing.map((m) => m.split('/').pop()).join(', ');
  return (
    `A pasta ${folder} não tem os scripts da Nova versão (${names}). ` +
    `Como resolver: eles ficam no branch ${INFR_NEW_VERSION_BRANCH} do INFR-Docker. Na pasta, rode ` +
    `"git fetch" e "git checkout ${INFR_NEW_VERSION_BRANCH}" e leia a origem de novo.`
  );
}

/**
 * Detalhe de um comando que falhou: o execFile só diz "Command failed: <comando>", e o motivo
 * fica no stderr/stdout. Devolve as últimas linhas não vazias (o fim é onde o script diz o erro).
 */
export function commandFailureDetail(err: { message?: string; stderr?: unknown; stdout?: unknown } | unknown, maxLines = 6): string {
  const e = (err ?? {}) as { message?: string; stderr?: unknown; stdout?: unknown };
  const output = [e.stderr, e.stdout]
    .map((s) => (s == null ? '' : String(s)))
    .join('\n')
    // eslint-disable-next-line no-control-regex -- tira as cores ANSI que os scripts imprimem
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (output.length > 0) return output.slice(-maxLines).join(' · ');
  return String(e.message || err);
}
