const MAX_RENAME_CANDIDATES = 20;
const MIN_RENAME_SIMILARITY = 0.8;
const MIN_RENAME_SIMILARITY_MARGIN = 0.1;

export function inferUnstagedRenameSources(
  sourcePaths: string[],
  destinationPaths: string[],
  readSource: (path: string) => string,
  readDestination: (path: string) => string,
): Map<string, string> {
  if (sourcePaths.length > MAX_RENAME_CANDIDATES
    || destinationPaths.length > MAX_RENAME_CANDIDATES) return new Map();

  const sources = sourcePaths.map((path) => ({ path, lines: getLines(readSource(path)) }));
  const destinations = destinationPaths.map((path) => ({ path, lines: getLines(readDestination(path)) }));
  const similarities = new Map<string, Map<string, number>>();

  for (const destination of destinations) {
    const destinationScores = new Map<string, number>();
    for (const source of sources) {
      destinationScores.set(source.path, getSimilarity(source.lines, destination.lines));
    }
    similarities.set(destination.path, destinationScores);
  }

  const destinationCandidates = new Map<string, string>();
  for (const [destination, scores] of similarities) {
    const best = getClearBestMatch(scores);
    if (best && best.score >= MIN_RENAME_SIMILARITY) {
      destinationCandidates.set(destination, best.path);
    }
  }

  const destinationsBySource = new Map<string, string[]>();
  for (const [destination, source] of destinationCandidates) {
    destinationsBySource.set(source, [...(destinationsBySource.get(source) ?? []), destination]);
  }

  const sourcesByDestination = new Map<string, string>();
  for (const [source, matchingDestinations] of destinationsBySource) {
    const sourceScores = new Map(
      destinations.map((destination) => [
        destination.path,
        similarities.get(destination.path)?.get(source) ?? 0,
      ]),
    );
    const best = getClearBestMatch(sourceScores);
    if (matchingDestinations.length === 1 && best?.path === matchingDestinations[0]) {
      sourcesByDestination.set(matchingDestinations[0], source);
    }
  }
  return sourcesByDestination;
}

function getLines(content: string): string[] {
  if (content.length === 0) return [];
  const lines = content.split(/\r\n|\n|\r/);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

function getSimilarity(original: string[], changed: string[]): number {
  const total = Math.max(original.length, changed.length);
  if (total === 0 || Math.min(original.length, changed.length) / total < MIN_RENAME_SIMILARITY) {
    return 0;
  }

  const forward = countOrderedMatches(original, changed);
  const reverse = countOrderedMatches(changed, original);
  return Math.max(forward, reverse) / total;
}

function countOrderedMatches(original: string[], changed: string[]): number {
  const positions = new Map<string, number[]>();
  for (let index = 0; index < changed.length; index++) {
    const line = changed[index];
    const linePositions = positions.get(line) ?? [];
    linePositions.push(index);
    positions.set(line, linePositions);
  }

  const cursors = new Map<string, number>();
  let nextPosition = 0;
  let matches = 0;
  for (const line of original) {
    const linePositions = positions.get(line);
    if (!linePositions) continue;
    let cursor = cursors.get(line) ?? 0;
    while (cursor < linePositions.length && linePositions[cursor] < nextPosition) cursor++;
    if (cursor === linePositions.length) {
      cursors.set(line, cursor);
      continue;
    }
    matches++;
    nextPosition = linePositions[cursor] + 1;
    cursors.set(line, cursor + 1);
  }
  return matches;
}

function getClearBestMatch(scores: Map<string, number>): { path: string; score: number } | null {
  const ranked = [...scores]
    .map(([path, score]) => ({ path, score }))
    .sort((left, right) => right.score - left.score);
  const [best, second] = ranked;
  if (!best || (second && best.score - second.score < MIN_RENAME_SIMILARITY_MARGIN)) return null;
  return best;
}
