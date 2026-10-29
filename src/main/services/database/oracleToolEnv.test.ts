import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildOracleToolEnv,
  deriveOracleHome,
  isMissingOracleHomeOutput,
  isOracleTool,
  resolveExecutable
} from './oracleToolEnv';

const exeName = (name: string) => (process.platform === 'win32' ? `${name}.exe` : name);

describe('oracleToolEnv', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'oracle-home-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /** Cria a estrutura mínima de uma instalação completa: bin/<exe> e rdbms/mesg. */
  function makeFullHome(withMesg = true): string {
    const home = path.join(root, 'client_1');
    fs.mkdirSync(path.join(home, 'bin'), { recursive: true });
    if (withMesg) fs.mkdirSync(path.join(home, 'rdbms', 'mesg'), { recursive: true });
    fs.writeFileSync(path.join(home, 'bin', exeName('expdp')), '');
    fs.writeFileSync(path.join(home, 'bin', exeName('exp')), '');
    return home;
  }

  it('reconhece os utilitários Oracle pelo nome, com ou sem caminho e .exe', () => {
    expect(isOracleTool('expdp')).toBe(true);
    expect(isOracleTool('C:\\oracle\\bin\\EXP.EXE')).toBe(true);
    expect(isOracleTool('/opt/oracle/bin/impdp')).toBe(true);
    expect(isOracleTool('pg_dump')).toBe(false);
  });

  it('acha o executável no PATH e deriva o ORACLE_HOME da instalação completa', () => {
    const home = makeFullHome();
    const env = { PATH: path.join(home, 'bin'), PATHEXT: '.EXE' };
    const resolved = resolveExecutable('expdp', env);
    expect(resolved?.toLowerCase()).toBe(path.join(home, 'bin', exeName('expdp')).toLowerCase());
    expect(deriveOracleHome(resolved!)).toBe(home);
    expect(buildOracleToolEnv('exp', env).ORACLE_HOME).toBe(home);
  });

  it('o home do executável tem precedência sobre um ORACLE_HOME herdado de outra instalação', () => {
    const home = makeFullHome();
    const env = { PATH: path.join(home, 'bin'), PATHEXT: '.EXE', ORACLE_HOME: 'C:\\outra\\instalacao' };
    expect(buildOracleToolEnv('expdp', env).ORACLE_HOME).toBe(home);
  });

  it('não mexe no ORACLE_HOME quando a pasta não é uma instalação completa (Instant Client)', () => {
    const home = makeFullHome(false);
    const env = { PATH: path.join(home, 'bin'), PATHEXT: '.EXE', ORACLE_HOME: 'C:\\definido' };
    expect(buildOracleToolEnv('expdp', env).ORACLE_HOME).toBe('C:\\definido');
    expect(buildOracleToolEnv('expdp', { PATH: path.join(home, 'bin'), PATHEXT: '.EXE' }).ORACLE_HOME).toBeUndefined();
  });

  it('aceita caminho absoluto configurado para o executável', () => {
    const home = makeFullHome();
    expect(buildOracleToolEnv(path.join(home, 'bin', 'expdp'), { PATH: '' }).ORACLE_HOME).toBe(home);
  });

  it('detecta as saídas de exp e expdp sem arquivos de mensagem', () => {
    expect(
      isMissingOracleHomeOutput('Message 206 not found; No message file for product=RDBMS, facility=EXP')
    ).toBe(true);
    expect(isMissingOracleHomeOutput('UDE-00019: You may need to set ORACLE_HOME to your Oracle software directory')).toBe(
      true
    );
    expect(isMissingOracleHomeOutput('ORA-01017: invalid username/password')).toBe(false);
  });
});
