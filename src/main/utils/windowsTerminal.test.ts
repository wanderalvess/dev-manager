import { describe, expect, it } from 'vitest';
import { wtArg } from './windowsTerminal';

describe('wtArg', () => {
  it('escapa todo ; para o Windows Terminal não abrir uma aba por comando', () => {
    expect(wtArg("cd /x && ./a.sh; echo ''; read -r")).toBe("cd /x && ./a.sh\\; echo ''\\; read -r");
    expect(wtArg('sem ponto e vírgula')).toBe('sem ponto e vírgula');
  });
});
