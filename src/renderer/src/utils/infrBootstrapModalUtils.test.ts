import { describe, expect, it } from 'vitest';
import {
  infrBootstrapModalParsePort,
  infrBootstrapModalPreviewCommand,
  infrBootstrapModalTabClass
} from './infrBootstrapModalUtils';

describe('infrBootstrapModalUtils', () => {
  it('usa o padrão quando a porta é vazia ou inválida', () => {
    expect(infrBootstrapModalParsePort('', 1521)).toBe(1521);
    expect(infrBootstrapModalParsePort('abc', 8080)).toBe(8080);
    expect(infrBootstrapModalParsePort('0', 8080)).toBe(8080);
    expect(infrBootstrapModalParsePort('1522', 1521)).toBe(1522);
  });

  it('monta a prévia com fallback de container e porta', () => {
    expect(infrBootstrapModalPreviewCommand('oracle_setup.sh', '', 0, 'oracle-winthor', 1521)).toBe(
      './oracle_setup.sh --container oracle-winthor --port 1521'
    );
    expect(infrBootstrapModalPreviewCommand('wta_setup.sh', 'x', 9090, 'linux-winthor', 8080)).toBe(
      './wta_setup.sh --container x --port 9090'
    );
  });

  it('diferencia aba ativa e inativa', () => {
    expect(infrBootstrapModalTabClass(true)).toContain('border-orange-500');
    expect(infrBootstrapModalTabClass(false)).toContain('border-transparent');
  });
});
