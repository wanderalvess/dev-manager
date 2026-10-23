import type { GitProjectInfo } from '../../shared/types';

/** Roda um git dentro do repositório indicado; rejeita se o git sair com erro. */
export type ProjectGitRunner = (
  projectPath: string,
  args: string[],
  timeoutMs: number
) => Promise<{ stdout: string; stderr: string }>;

/** Só lê refs locais (sem rede): curto para um repositório travado não segurar a lista inteira. */
export const UNPUSHED_COUNT_TIMEOUT_MS = 15 * 1000;

const UNPUSHED_COUNT_CONCURRENCY = 4;

/**
 * Commits locais que o `origin` ainda não tem, por repositório, comparando com a ref remota já
 * baixada (sem `fetch`: o número pode estar um pouco atrasado, mas a lista abre rápido). Ficam de
 * fora HEAD destacado, branch que o origin não conhece (é "só local", outro filtro) e repositórios
 * em que o git falhou.
 */
export async function collectUnpushedCounts(
  projects: GitProjectInfo[],
  run: ProjectGitRunner
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const measurable = projects.filter(
    (p) => !p.detachedHead && p.currentBranch !== 'unknown' && (p.remoteBranches || []).includes(p.currentBranch)
  );

  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < measurable.length) {
      const project = measurable[nextIndex++];
      try {
        const { stdout } = await run(
          project.path,
          ['--no-optional-locks', 'rev-list', '--count', `refs/remotes/origin/${project.currentBranch}..HEAD`],
          UNPUSHED_COUNT_TIMEOUT_MS
        );
        const count = Number.parseInt(stdout.trim(), 10);
        if (!Number.isNaN(count)) counts[project.path] = count;
      } catch {
        // Repositório ilegível: simplesmente não entra na contagem.
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(UNPUSHED_COUNT_CONCURRENCY, measurable.length) }, worker));
  return counts;
}
