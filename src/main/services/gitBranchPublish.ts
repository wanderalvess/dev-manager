import type { GitBranchPublishStatus } from '../../shared/types';
import { isPublishableBranchName, parseLsRemoteHeadSha } from '../utils/gitPublishUtils';

/** Roda um git no repositório; rejeita se o git sair com erro. */
export type GitRunner = (args: string[], timeoutMs: number) => Promise<{ stdout: string; stderr: string }>;

const LOCAL_TIMEOUT_MS = 10 * 1000;
/** Curto de propósito: é só uma checagem antes do PR; sem rede/credencial o painel cai nas refs locais. */
export const LS_REMOTE_TIMEOUT_MS = 20 * 1000;

async function succeeds(run: GitRunner, args: string[]): Promise<boolean> {
  try {
    await run(args, LOCAL_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

export async function readCurrentBranch(run: GitRunner): Promise<string | null> {
  try {
    const { stdout } = await run(['symbolic-ref', '--short', '-q', 'HEAD'], LOCAL_TIMEOUT_MS);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function countUnpushed(run: GitRunner, base: string): Promise<number | null> {
  try {
    const { stdout } = await run(['rev-list', '--count', `${base}..HEAD`], LOCAL_TIMEOUT_MS);
    const count = Number.parseInt(stdout.trim(), 10);
    return Number.isNaN(count) ? null : count;
  } catch {
    return null;
  }
}

/**
 * Descobre se a branch atual já está no origin. O Azure DevOps recusa o formulário de PR
 * (TF401175, "version descriptor could not be resolved") quando a branch de origem só existe local,
 * então a checagem consulta o origin de verdade (ls-remote) em vez de confiar nas refs remotas locais,
 * que ficam velhas até o próximo fetch.
 */
export async function readBranchPublishStatus(run: GitRunner): Promise<GitBranchPublishStatus> {
  const branch = await readCurrentBranch(run);
  if (!branch) {
    return {
      branch: '',
      publishedOnRemote: false,
      verifiedOnRemote: false,
      unpushedCommits: null,
      warning: 'HEAD destacado: faça checkout de uma branch.'
    };
  }

  let remoteSha: string | null = null;
  let verified = false;
  let warning: string | undefined;
  try {
    const { stdout } = await run(['ls-remote', '--heads', 'origin', `refs/heads/${branch}`], LS_REMOTE_TIMEOUT_MS);
    remoteSha = parseLsRemoteHeadSha(stdout, branch);
    verified = true;
  } catch (err: any) {
    warning = `Não foi possível consultar o origin (${err?.message || err}); usando as refs remotas locais.`;
  }

  const trackingRef = `refs/remotes/origin/${branch}`;
  const hasTrackingRef = await succeeds(run, ['rev-parse', '--verify', '--quiet', trackingRef]);
  const published = verified ? remoteSha !== null : hasTrackingRef;

  let unpushedCommits: number | null = null;
  if (published) {
    const shaKnownLocally = remoteSha !== null && (await succeeds(run, ['cat-file', '-e', `${remoteSha}^{commit}`]));
    const base = shaKnownLocally ? remoteSha : hasTrackingRef ? trackingRef : null;
    if (base) unpushedCommits = await countUnpushed(run, base);
  }

  return { branch, publishedOnRemote: published, verifiedOnRemote: verified, unpushedCommits, warning };
}

/** `git push --set-upstream origin <branch>`; lança em caso de erro (o service formata a mensagem). */
export async function publishCurrentBranch(run: GitRunner, timeoutMs: number): Promise<string> {
  const branch = await readCurrentBranch(run);
  if (!branch) throw new Error('HEAD destacado: faça checkout de uma branch antes de publicar.');
  if (!isPublishableBranchName(branch)) throw new Error(`Nome de branch inválido para publicar: ${branch}`);

  const { stdout, stderr } = await run(['push', '--set-upstream', 'origin', branch], timeoutMs);
  return stdout || stderr || `Branch '${branch}' publicada em origin.`;
}
