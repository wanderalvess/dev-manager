import fs from 'fs';
import os from 'os';
import { describe, expect, it } from 'vitest';
import { buildOracleParfileContent, writeTempOracleParfile } from './oracleParfile';

describe('oracleParfile', () => {
  it('põe o userid com a senha entre aspas e um parâmetro por linha', () => {
    const content = buildOracleParfileContent('local', 'p@ss#1', ['directory=local', 'schemas=local']);
    expect(content.split(os.EOL)).toEqual(['userid=local/"p@ss#1"', 'directory=local', 'schemas=local', '']);
  });

  it('recusa senha com aspas duplas ou quebra de linha', () => {
    expect(() => buildOracleParfileContent('local', 'a"b', [])).toThrow(/aspas duplas/);
    expect(() => buildOracleParfileContent('local', 'a\nb', [])).toThrow(/quebra de linha/);
  });

  it('grava o parfile temporário e o apaga no cleanup', async () => {
    const { filePath, cleanup } = await writeTempOracleParfile('userid=local/"x"\n');
    expect(fs.readFileSync(filePath, 'utf8')).toBe('userid=local/"x"\n');
    await cleanup();
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
