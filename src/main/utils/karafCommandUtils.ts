import { OsgiResolutionDiagnosticSummary } from '../../shared/types';
import { diagnoseKarafResolutionError } from './karafResolutionParser';

/**
 * Remove ruídos benignos emitidos pela JVM ou scripts do Karaf para stderr
 * (ex: aviso de KARAF_HOME, Picked up JAVA_TOOL_OPTIONS, inicialização do OpenTelemetry)
 * para não poluir mensagens de feedback nem mascarar erros reais da automação.
 */
export function filterBenignStderr(rawStderr: string): string {
  if (!rawStderr) return '';
  return rawStderr
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^Picked up (?:JAVA_TOOL_OPTIONS|_JAVA_OPTIONS):/i.test(trimmed)) return false;
      if (/^client\.bat:\s*Ignoring predefined value for KARAF_HOME/i.test(trimmed)) return false;
      if (/^\[otel\.javaagent\s+.*\]\s+\[.*\]\s+INFO\s+/i.test(trimmed)) return false;
      return true;
    })
    .join('\r\n');
}

/** Comandos de instalação/repositório baixam dependências via rede (Nexus/Maven) e resolvem OSGi. */
export function isHeavyKarafCommand(command: string): boolean {
  return /^(?:feature:(?:install|repo-add)|bundle:(?:install|update))/i.test(command.trim());
}

/** Remove sequências de escape ANSI da saída do client do Karaf. */
export function stripAnsiSequences(text: string): string {
  // eslint-disable-next-line no-control-regex -- ESC (0x1B) e o marcador real da sequencia de escape ANSI a remover
  return text.replace(/[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g, '').replace(/\[[0-9;]+m/g, '');
}

/**
 * Procura na saída limpa o primeiro erro real do Karaf (o client retorna exit code 0 mesmo
 * quando o comando falha no contêiner OSGi). Retorna null se nenhum erro for detectado.
 */
export function findKarafErrorMatch(command: string, cleanCombined: string): RegExpMatchArray | null {
  const isLogDisplay = command.trim().startsWith('log:display');
  const errorPattern = /(?:Error executing command(?: on bundles)?|Command not found|Failed to get the session|Authentication failed|Connection refused|ConnectException|Session is closed)/i;
  let karafErrorMatch: RegExpMatchArray | null = null;

  if (!isLogDisplay) {
    const lines = cleanCombined.split(/\r?\n/);
    for (const line of lines) {
      if (errorPattern.test(line)) {
        karafErrorMatch = [line.trim()] as RegExpMatchArray;
        break;
      }
    }
  } else if (cleanCombined.trim().startsWith('Error executing command:')) {
    karafErrorMatch = cleanCombined.match(/Error executing command:\s*([^\r\n]+)/i);
  }
  return karafErrorMatch;
}

/** Converte o diagnóstico de resolução OSGi no resumo exposto pela API pública. */
export function toResolutionSummary(
  diag: NonNullable<ReturnType<typeof diagnoseKarafResolutionError>>
): OsgiResolutionDiagnosticSummary {
  return {
    failingBundle: diag.rootCause.bundleName,
    missingItem: diag.rootCause.missingItem,
    requirementType: diag.rootCause.requirementType,
    versionRangeDesc: diag.rootCause.versionRangeDesc,
    matchedPomDependency: diag.matchedPomDependency,
    matchedProfileName: diag.matchedProfileName,
    matchedProfileId: diag.matchedProfileId,
    matchedProjectName: diag.matchedProjectName,
    matchedProjectPath: diag.matchedProjectPath,
    suggestedKarafCommands: diag.suggestedKarafCommands,
    versionMismatchWarning: diag.versionMismatchWarning,
    formattedBanner: diag.formattedBanner
  };
}
