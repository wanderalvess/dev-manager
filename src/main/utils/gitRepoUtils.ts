import { GitCommitInfo, GitFileStatus, GitProjectInfo } from '../../shared/types';

export interface ParsedGitRemote {
  provider?: GitProjectInfo['provider'];
  azureOrg: string;
  azureProject: string;
  azureRepo: string;
  owner: string;
  repo: string;
  /** URL navegável do repositório no provedor (sem credenciais), quando for possível deduzir. */
  webUrl?: string;
}

/**
 * Remove usuário/senha/token embutidos em remotes HTTP(S) (ex: https://user:PAT@dev.azure.com/...).
 * A URL do remote é devolvida pela API web e pelo MCP; sem isso um PAT gravado no .git/config vaza.
 */
export function sanitizeRemoteUrl(remoteUrl: string): string {
  return remoteUrl.trim().replace(/^(https?:\/\/)[^/@]+@/i, '$1');
}

function stripGitSuffix(value: string): string {
  return value.replace(/\.git$/i, '');
}

/** Converte remotes SSH/SCP (git@host:caminho, ssh://git@host:porta/caminho) em URL HTTPS navegável. */
function toBrowsableUrl(remoteUrl: string): string | undefined {
  if (/^https?:\/\//i.test(remoteUrl)) {
    return stripGitSuffix(remoteUrl.replace(/\/+$/, ''));
  }
  const sshMatch = remoteUrl.match(/^ssh:\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/(.+)$/i);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${stripGitSuffix(sshMatch[2].replace(/\/+$/, ''))}`;
  }
  // Host com 2+ caracteres para não confundir um remote local tipo "C:\repos\app" com SCP.
  const scpMatch = remoteUrl.match(/^(?:[^@/]+@)?([^/:\\]{2,}):(?!\/)(.+)$/);
  if (scpMatch) {
    return `https://${scpMatch[1]}/${stripGitSuffix(scpMatch[2].replace(/\/+$/, ''))}`;
  }
  return undefined;
}

/**
 * Identifica o provedor (Azure DevOps, GitHub, GitLab) a partir da URL do remote e extrai as
 * coordenadas usadas para montar a URL de PR/MR e o link "Ver no ...".
 */
export function parseRemoteUrl(rawRemoteUrl: string): ParsedGitRemote {
  const result: ParsedGitRemote = { azureOrg: '', azureProject: '', azureRepo: '', owner: '', repo: '' };
  const remoteUrl = sanitizeRemoteUrl(rawRemoteUrl || '');
  if (!remoteUrl) return result;

  const azureMatch =
    remoteUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/?#\s]+)/i) ||
    remoteUrl.match(/ssh\.dev\.azure\.com[:/]v3\/([^/]+)\/([^/]+)\/([^/?#\s]+)/i) ||
    remoteUrl.match(/vs-ssh\.visualstudio\.com[:/]v3\/([^/]+)\/([^/]+)\/([^/?#\s]+)/i);
  // Formato legado {org}.visualstudio.com, ainda comum em organizações antigas do Azure DevOps.
  const legacyAzureMatch = !azureMatch
    ? remoteUrl.match(/\/\/([^./@]+)\.visualstudio\.com\/(?:DefaultCollection\/)?([^/]+)\/_git\/([^/?#\s]+)/i)
    : null;
  const azure = azureMatch || legacyAzureMatch;

  if (azure) {
    result.provider = 'azure';
    result.azureOrg = azure[1];
    result.azureProject = azure[2];
    result.azureRepo = stripGitSuffix(azure[3].replace(/\/+$/, ''));
    result.webUrl = `https://dev.azure.com/${result.azureOrg}/${result.azureProject}/_git/${result.azureRepo}`;
    return result;
  }

  const githubMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/?#\s]+?)(?:\.git)?\/?$/i);
  if (githubMatch) {
    result.provider = 'github';
    result.owner = githubMatch[1];
    result.repo = githubMatch[2];
    result.webUrl = `https://github.com/${result.owner}/${result.repo}`;
    return result;
  }

  // GitLab aceita subgrupos (grupo/subgrupo/repo): o "owner" é o caminho completo do namespace.
  const gitlabMatch = remoteUrl.match(/gitlab\.com[:/](.+)\/([^/?#\s]+?)(?:\.git)?\/?$/i);
  if (gitlabMatch) {
    result.provider = 'gitlab';
    result.owner = gitlabMatch[1];
    result.repo = gitlabMatch[2];
    result.webUrl = `https://gitlab.com/${result.owner}/${result.repo}`;
    return result;
  }

  result.webUrl = toBrowsableUrl(remoteUrl);
  return result;
}

/** Extrai o caminho de um arquivo `.git` de worktree/submódulo (`gitdir: <caminho>`). */
export function parseGitDirFile(content: string): string | null {
  const match = content.match(/^gitdir:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

/** Lista as refs de `packed-refs` sob um prefixo (ex: `refs/heads/`), devolvendo o nome sem o prefixo. */
export function parsePackedRefs(content: string, prefix: string): string[] {
  const names: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('^')) continue;
    const ref = line.split(' ')[1];
    if (ref && ref.startsWith(prefix)) {
      names.push(ref.slice(prefix.length));
    }
  }
  return names;
}

/**
 * Interpreta a saída de `git status --porcelain -z`. Com `-z` o Git não escapa nomes com acento
 * (sem -z, "relatório.txt" viria como "relat\303\263rio.txt") e renomeações chegam como
 * "R  novo\0antigo\0" em vez de "antigo -> novo".
 */
export function parseStatusPorcelainZ(stdout: string): GitFileStatus[] {
  const entries = stdout.split('\0');
  const fileStatuses: GitFileStatus[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.length < 4) continue;
    const x = entry[0];
    const y = entry[1];
    const filePath = entry.substring(3);
    const isRenameOrCopy = x === 'R' || x === 'C' || y === 'R' || y === 'C';
    const originalPath = isRenameOrCopy ? entries[++i] : undefined;

    let status: GitFileStatus['status'];
    let staged: boolean;

    if (x === '?' && y === '?') {
      status = 'untracked';
      staged = false;
    } else if (x === 'A' || y === 'A') {
      status = 'added';
      staged = x === 'A';
    } else if (x === 'D' || y === 'D') {
      status = 'deleted';
      staged = x === 'D';
    } else if (x === 'R' || y === 'R') {
      status = 'renamed';
      staged = x === 'R';
    } else if (x === 'C' || y === 'C') {
      status = 'copied';
      staged = x === 'C';
    } else {
      status = 'modified';
      staged = x !== ' ' && x !== '?';
    }

    fileStatuses.push(originalPath ? { path: filePath, status, staged, originalPath } : { path: filePath, status, staged });
  }

  return fileStatuses;
}

/** Separador de campos do `git log --pretty`; não aparece em nome de autor nem em assunto de commit. */
export const GIT_LOG_FIELD_SEPARATOR = '\x1f';

export function parseCommitLog(stdout: string): GitCommitInfo[] {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash = '', author = '', date = '', ...rest] = line.split(GIT_LOG_FIELD_SEPARATOR);
      return { hash, author, date, message: rest.join(GIT_LOG_FIELD_SEPARATOR) };
    });
}
