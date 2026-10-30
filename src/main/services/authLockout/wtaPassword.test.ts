import { describe, expect, it } from 'vitest';
import { encodeWtaPassword } from './wtaPassword';

describe('encodeWtaPassword', () => {
  it('manda o MD5 em maiúsculas, como o login do WTA espera', () => {
    expect(encodeWtaPassword('1')).toBe('C4CA4238A0B923820DCC509A6F75849B');
  });

  it('hash já pronto vai como está, em maiúsculas', () => {
    expect(encodeWtaPassword('c4ca4238a0b923820dcc509a6f75849b')).toBe('C4CA4238A0B923820DCC509A6F75849B');
  });

  it('texto puro não mexe na senha', () => {
    expect(encodeWtaPassword('1', 'plain')).toBe('1');
  });
});
