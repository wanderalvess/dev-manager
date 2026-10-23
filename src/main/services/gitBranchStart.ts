/**
 * Resolve o ponto de partida de uma branch nova. As branches remotas chegam à UI sem o prefixo
 * "origin/" (ex.: "release/39.0"), e `git checkout -b nova release/39.0` só enxerga refs locais:
 * falha com "not a commit" quando a base existe apenas no origin.
 */
export async function resolveStartPoint(
  run: (args: string[]) => Promise<unknown>,
  base: string
): Promise<string> {
  const exists = (ref: string) =>
    run(['rev-parse', '--verify', '--quiet', ref]).then(
      () => true,
      () => false
    );
  if (await exists(`refs/heads/${base}`)) return base;
  if (await exists(`refs/remotes/origin/${base}`)) return `origin/${base}`;
  return base;
}
