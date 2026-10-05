import { describe, expect, it } from 'vitest';
import { splitCommandLine } from './commandLineUtils';

describe('splitCommandLine', () => {
  it('divide por espaços simples', () => {
    expect(splitCommandLine('mvn test -q')).toEqual(['mvn', 'test', '-q']);
  });

  it('mantém argumentos entre aspas como um único token, sem as aspas', () => {
    expect(splitCommandLine('node -e "process.exit(3)"')).toEqual(['node', '-e', 'process.exit(3)']);
    expect(splitCommandLine("npx cypress run --spec 'a b/c.cy.ts'")).toEqual(['npx', 'cypress', 'run', '--spec', 'a b/c.cy.ts']);
  });

  it('preserva token vazio entre aspas e ignora espaços repetidos', () => {
    expect(splitCommandLine('echo   ""  x')).toEqual(['echo', '', 'x']);
    expect(splitCommandLine('   ')).toEqual([]);
  });
});
