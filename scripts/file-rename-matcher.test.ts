import { describe, expect, it } from 'vitest';
import { inferUnstagedRenameSources } from './file-rename-matcher';

const readFrom = (files: Map<string, string>) => (path: string): string => files.get(path) ?? '';

describe('unstaged rename matching', () => {
  it('matches ordered content at the 80% threshold and reads each candidate once', () => {
    const sourceFiles = new Map([
      ['src/legacy.ts', 'one\ntwo\nthree\nfour\nfive'],
      ['src/other.ts', 'unrelated\ncontent\nonly'],
    ]);
    const destinationFiles = new Map([
      ['src/new/location.ts', 'one\ntwo\nthree\nfour'],
      ['src/new/other.ts', 'unrelated\ncontent\nchanged'],
    ]);
    const sourceReads = new Map<string, number>();
    const destinationReads = new Map<string, number>();
    const trackReads = (files: Map<string, string>, reads: Map<string, number>) => (path: string): string => {
      reads.set(path, (reads.get(path) ?? 0) + 1);
      return files.get(path) ?? '';
    };

    const matches = inferUnstagedRenameSources(
      [...sourceFiles.keys()],
      [...destinationFiles.keys()],
      trackReads(sourceFiles, sourceReads),
      trackReads(destinationFiles, destinationReads),
    );

    expect(matches).toEqual(new Map([['src/new/location.ts', 'src/legacy.ts']]));
    expect([...sourceReads.values()]).toEqual([1, 1]);
    expect([...destinationReads.values()]).toEqual([1, 1]);
  });

  it('does not let a unique same-basename pair bypass content similarity', () => {
    const matches = inferUnstagedRenameSources(
      ['src/old/same.ts'],
      ['src/new/same.ts'],
      readFrom(new Map([['src/old/same.ts', 'original one\noriginal two']])),
      readFrom(new Map([['src/new/same.ts', 'different one\ndifferent two']])),
    );

    expect(matches.size).toBe(0);
  });

  it('does not pair a destination below the 80% similarity threshold', () => {
    const matches = inferUnstagedRenameSources(
      ['src/source.ts'],
      ['src/destination.ts'],
      readFrom(new Map([['src/source.ts', 'one\ntwo\nthree\nfour\nfive']])),
      readFrom(new Map([['src/destination.ts', 'one\ntwo\nthree']])),
    );

    expect(matches.size).toBe(0);
  });

  it('rejects shuffled content even when its line multiset is identical', () => {
    const matches = inferUnstagedRenameSources(
      ['src/source.ts'],
      ['src/destination.ts'],
      readFrom(new Map([['src/source.ts', 'one\ntwo\nthree\nfour\nfive']])),
      readFrom(new Map([['src/destination.ts', 'five\nfour\nthree\ntwo\none']])),
    );

    expect(matches.size).toBe(0);
  });

  it('recognizes ordered overlap when one line is moved out of position', () => {
    const matches = inferUnstagedRenameSources(
      ['src/source.ts'],
      ['src/destination.ts'],
      readFrom(new Map([['src/source.ts', 'one\ntwo\nthree\nfour\nfive']])),
      readFrom(new Map([['src/destination.ts', 'two\nthree\nfour\nfive\none']])),
    );

    expect(matches).toEqual(new Map([['src/destination.ts', 'src/source.ts']]));
  });

  it('keeps a destination new when deleted-source similarity is ambiguous', () => {
    const sourceFiles = new Map([
      ['src/ambiguous-one.ts', 'one\ntwo\nthree\nfour\nfive'],
      ['src/ambiguous-two.ts', 'one\ntwo\nthree\nfour\nfive'],
    ]);
    const matches = inferUnstagedRenameSources(
      [...sourceFiles.keys()],
      ['src/destination.ts'],
      readFrom(sourceFiles),
      readFrom(new Map([['src/destination.ts', 'one\ntwo\nthree\nfour']])),
    );

    expect(matches.size).toBe(0);
  });

  it('keeps competing destinations new when both match the same deleted source', () => {
    const source = Array.from({ length: 10 }, (_, index) => `source ${index}`).join('\n');
    const matches = inferUnstagedRenameSources(
      ['src/source.ts'],
      ['src/first.ts', 'src/second.ts'],
      readFrom(new Map([['src/source.ts', source]])),
      readFrom(new Map([
        ['src/first.ts', `${source.split('\n').slice(0, 9).join('\n')}\nfirst-only`],
        ['src/second.ts', `${source.split('\n').slice(0, 9).join('\n')}\nsecond-only`],
      ])),
    );

    expect(matches.size).toBe(0);
  });

  it('requires each match to be the source’s clear best destination', () => {
    const sourceOne = Array.from({ length: 100 }, (_, index) => `source ${index}`);
    const sourceTwo = [
      ...sourceOne.slice(19),
      ...Array.from({ length: 19 }, (_, index) => `second-only ${index}`),
    ];
    const sourceFiles = new Map([
      ['src/reciprocal-one.ts', sourceOne.join('\n')],
      ['src/reciprocal-two.ts', sourceTwo.join('\n')],
    ]);
    const destinationFiles = new Map([
      ['src/first-destination.ts', [
        ...sourceOne.slice(0, 80),
        ...Array.from({ length: 20 }, (_, index) => `first-only ${index}`),
      ].join('\n')],
      ['src/second-destination.ts', sourceTwo.join('\n')],
    ]);

    const matches = inferUnstagedRenameSources(
      [...sourceFiles.keys()],
      [...destinationFiles.keys()],
      readFrom(sourceFiles),
      readFrom(destinationFiles),
    );

    expect(matches).toEqual(new Map([['src/second-destination.ts', 'src/reciprocal-two.ts']]));
  });

  it.each([
    { side: 'deleted', sourceCount: 21, destinationCount: 1 },
    { side: 'untracked', sourceCount: 1, destinationCount: 21 },
  ])('skips fallback when there are too many $side candidates', ({
    sourceCount, destinationCount,
  }) => {
    let reads = 0;
    const read = (): string => {
      reads++;
      return 'matching content';
    };
    const sources = Array.from({ length: sourceCount }, (_, index) => `deleted-${index}.ts`);
    const destinations = Array.from(
      { length: destinationCount },
      (_, index) => `new-${index}.ts`,
    );

    const matches = inferUnstagedRenameSources(sources, destinations, read, read);

    expect(matches.size).toBe(0);
    expect(reads).toBe(0);
  });
});
