import { validateBranchName } from './gitRepoUtils';

/** Extrai o hash da branch da saída de `git ls-remote --heads origin refs/heads/<branch>`; null se ela não existe. */
export function parseLsRemoteHeadSha(stdout: string, branch: string): string | null {
  const wanted = `refs/heads/${branch}`;
  for (const line of stdout.split('\n')) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (ref === wanted && /^[0-9a-f]{40,64}$/i.test(sha)) return sha;
  }
  return null;
}

/** Nome que pode ir para `git push`: válido para o git e sem hífen inicial (viraria opção). */
export function isPublishableBranchName(branch: string): boolean {
  return validateBranchName(branch).valid && !branch.startsWith('-');
}
