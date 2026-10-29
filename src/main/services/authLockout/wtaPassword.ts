import { createHash } from 'crypto';
import type { AuthLockoutPasswordEncoding } from '../../../shared/authLockoutTypes';

const MD5_HEX = /^[0-9a-f]{32}$/i;

/**
 * O login do WTA recebe o MD5 da senha em hexadecimal maiúsculo (senha "1" → C4CA4238A0B923820DCC509A6F75849B).
 * Um valor que já é um MD5 (32 hex) vai como está, em maiúsculas: a pessoa pode colar o hash pronto.
 */
export function encodeWtaPassword(password: string, encoding: AuthLockoutPasswordEncoding = 'md5'): string {
  if (encoding === 'plain') return password;
  if (MD5_HEX.test(password)) return password.toUpperCase();
  return createHash('md5').update(password, 'utf8').digest('hex').toUpperCase();
}
