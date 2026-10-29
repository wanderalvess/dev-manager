import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Conteúdo do parfile do expdp/impdp: `userid` e os demais parâmetros, um por linha.
 * A senha vai entre aspas duplas (o Data Pump aceita assim caracteres especiais como `@` e `#`);
 * a conexão não entra aqui, vem da variável LOCAL/TWO_TASK (ver buildOracleConnectEnv).
 */
export function buildOracleParfileContent(user: string, password: string, params: string[]): string {
  if (/["\r\n\0]/.test(password)) {
    throw new Error('A senha contém aspas duplas ou quebra de linha, que o parfile do Oracle não aceita.');
  }
  return [`userid=${user}/"${password}"`, ...params].join(os.EOL) + os.EOL;
}

/**
 * Grava o parfile num arquivo temporário legível só pelo usuário atual e devolve o caminho
 * e uma função que o apaga. É por aqui que a senha chega ao expdp/impdp: no Windows eles
 * leem a senha do console, não do stdin, e na linha de comando ela ficaria visível na lista
 * de processos.
 */
export async function writeTempOracleParfile(content: string): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'devmanager-oracle-'));
  const filePath = path.join(dir, `${crypto.randomUUID()}.par`);
  await fs.promises.writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 });
  return {
    filePath,
    cleanup: () => fs.promises.rm(dir, { recursive: true, force: true })
  };
}
