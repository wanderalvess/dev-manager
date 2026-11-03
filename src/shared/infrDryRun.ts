/**
 * Ensaio da resolução: o Karaf do WTA de origem simula (`feature:install -t`) a instalação das features trocadas, com
 * os repositórios novos acrescentados e depois retirados. É o próprio Karaf resolvendo, então pega o que a conferência
 * por catálogo não vê. Só o roteiro e a leitura da saída ficam aqui; quem executa é o InfrVersionService.
 */
import type { ManifestChange } from './infrVersionManifest';

export interface DryRunReport {
  /** Comandos simulados (features) */
  simulated: number;
  /** Linhas de erro do Karaf (sem cores), no máximo 8 */
  errors: string[];
  /** Fim da saída, para o registro */
  tail: string[];
  /** Não rodou: o motivo (cliente indisponível, tempo esgotado...) */
  skipped?: string;
}

const SAFE_NAME = /^[A-Za-z0-9_.-]+$/;
const SAFE_MVN = /^mvn:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/xml(?:\/features)?$/;

/** Roteiro do console do Karaf (um comando por linha); ignora nomes e repositórios fora do padrão seguro. */
export function buildDryRunCommands(newRepos: string[], changes: Pick<ManifestChange, 'name' | 'to'>[]): string[] {
  const repos = newRepos.filter((r) => SAFE_MVN.test(r));
  const features = changes.filter((c) => SAFE_NAME.test(c.name) && SAFE_NAME.test(c.to));
  return [
    ...repos.map((r) => `feature:repo-add ${r}`),
    ...features.map((c) => `feature:install -t -v ${c.name}/${c.to}`),
    ...repos.map((r) => `feature:repo-remove ${r}`)
  ];
}

// eslint-disable-next-line no-control-regex -- cores ANSI do console do Karaf
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

export function parseDryRunOutput(output: string, simulated: number): DryRunReport {
  const lines = output.replace(ANSI, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors = lines.filter((l) => /Unable to resolve|missing requirement|Error executing command|Can't install|No matching features|Cannot resolve/i.test(l));
  const unique = [...new Set(errors)].slice(0, 8);
  return { simulated, errors: unique, tail: lines.slice(-6) };
}
