import { describe, expect, it } from 'vitest';
import { isPublishableBranchName, parseLsRemoteHeadSha } from './gitPublishUtils';

const SHA = 'a'.repeat(40);

describe('parseLsRemoteHeadSha', () => {
  it('devolve o hash da branch pedida', () => {
    expect(parseLsRemoteHeadSha(`${SHA}\trefs/heads/bugfix/x\n`, 'bugfix/x')).toBe(SHA);
  });

  it('devolve null com saída vazia (branch fora do origin)', () => {
    expect(parseLsRemoteHeadSha('', 'bugfix/x')).toBeNull();
  });

  it('não confunde branches de nome parecido', () => {
    expect(parseLsRemoteHeadSha(`${SHA}\trefs/heads/bugfix/x-2\n`, 'bugfix/x')).toBeNull();
  });
});

describe('isPublishableBranchName', () => {
  it('aceita nomes comuns de branch', () => {
    expect(isPublishableBranchName('bugfix/DDWMISSI-5859-release')).toBe(true);
  });

  it('recusa nome vazio, com espaço ou que virariam opção do git', () => {
    expect(isPublishableBranchName('')).toBe(false);
    expect(isPublishableBranchName('a b')).toBe(false);
    expect(isPublishableBranchName('--force')).toBe(false);
  });
});
