/** Situação da branch atual em relação ao remoto "origin", usada antes de abrir um Pull Request. */
export interface GitBranchPublishStatus {
  /** Branch atual; vazia com HEAD destacado. */
  branch: string;
  /** A branch existe no origin. */
  publishedOnRemote: boolean;
  /** `true` quando o origin foi consultado (ls-remote); `false` = só as refs locais (offline, sem credencial). */
  verifiedOnRemote: boolean;
  /** Commits locais que o origin ainda não tem; null quando não dá para calcular (branch não publicada). */
  unpushedCommits: number | null;
  /** Motivo de não ter conseguido consultar o origin ou de não haver branch. */
  warning?: string;
}
