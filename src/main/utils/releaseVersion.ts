/**
 * Helpers puros para o fluxo de atualização manual (build portátil), que consulta a API de
 * GitHub Releases diretamente — o electron-updater não atualiza o executável portátil.
 */

export const GITHUB_LATEST_RELEASE_PAGE_URL = 'https://github.com/wanderalvess/dev-manager/releases/latest';

export interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GithubRelease {
  tag_name: string;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GithubReleaseAsset[];
}

/** Converte "v1.38.0" / "1.38.0-beta" em [1, 38, 0]; partes não numéricas viram 0. */
export function parseVersion(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/** > 0 se `a` é mais nova que `b`, < 0 se mais antiga, 0 se iguais. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Escolhe o .exe portátil da release (nome contém "portable"); senão nenhum. */
export function pickPortableAsset(release: GithubRelease): GithubReleaseAsset | undefined {
  return release.assets?.find((a) => /portable/i.test(a.name) && a.name.toLowerCase().endsWith('.exe'));
}

/** Identifica se o erro é decorrente de validação de assinatura digital Authenticode. */
export function isSignatureVerificationError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /not signed by the application owner|publisherNames|ERR_UPDATER_INVALID_SIGNATURE/i.test(msg);
}

/**
 * Converte erros técnicos do electron-updater (ex.: falha de assinatura de código em certificado
 * auto-assinado ou instabilidades de rede) em mensagens legíveis e explicativas para o usuário.
 */
export function formatUpdateErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (isSignatureVerificationError(msg)) {
    return 'A assinatura digital da nova versão não é reconhecida como confiável pelo Windows (certificado interno). O instalador pode ser baixado manualmente pelo GitHub Releases.';
  }
  if (/net::ERR_INTERNET_DISCONNECTED|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    return 'Sem conexão com a internet. Verifique sua conexão de rede e tente novamente.';
  }
  if (/ETIMEDOUT|ESOCKETTIMEDOUT|timeout/i.test(msg)) {
    return 'Tempo limite esgotado ao conectar aos servidores do GitHub Releases. Tente novamente.';
  }
  if (/ERR_UPDATER_WEB_INSTALLER_DISABLED/i.test(msg)) {
    return 'Instalador web desativado na configuração da aplicação.';
  }
  return msg || 'Erro desconhecido ao processar atualização.';
}
