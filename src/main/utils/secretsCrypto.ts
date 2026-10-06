import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Criptografia em repouso para segredos persistidos em config.json (senhas de banco,
 * senha do Karaf, tokens do Confluence/Jira, chaves de API de LLM).
 *
 * ConfigService é compartilhado por três runtimes independentes (Electron em src/main,
 * o servidor web em src/server, e o servidor MCP em src/mcp) — os dois últimos rodam como
 * Node puro, sem Electron disponível. Por isso não usamos safeStorage do Electron (que só
 * funciona dentro do processo Electron, ligado à conta do usuário via DPAPI no Windows):
 * a mesma config.json precisa continuar legível nos três. Em vez disso, a chave AES-256 é
 * gerada uma vez e guardada num arquivo próprio, ao lado do config.json, legível pelos três
 * runtimes igualmente.
 *
 * Isso protege contra a cópia descuidada de config.json sozinho (backup em nuvem, enviar por
 * engano, etc.) — não protege contra quem já tem acesso de leitura à pasta de config inteira,
 * já que a chave está ali do lado.
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_FILE_NAME = '.secrets.key';
const ENC_PREFIX = 'enc:v1:';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const keyCache = new Map<string, Buffer>();

function getOrCreateKey(configDir: string): Buffer {
  const cached = keyCache.get(configDir);
  if (cached) return cached;

  const keyPath = path.join(configDir, KEY_FILE_NAME);
  let key: Buffer;
  if (fs.existsSync(keyPath)) {
    key = Buffer.from(fs.readFileSync(keyPath, 'utf-8').trim(), 'hex');
  } else {
    key = crypto.randomBytes(32);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(keyPath, key.toString('hex'), { encoding: 'utf-8', mode: 0o600 });
  }
  keyCache.set(configDir, key);
  return key;
}

/** Criptografa uma string de segredo. Retorna `plainText` inalterado se vazio/undefined. */
export function encryptSecret(plainText: string | undefined, configDir: string): string | undefined {
  if (!plainText) return plainText;
  try {
    const key = getOrCreateKey(configDir);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return ENC_PREFIX + Buffer.concat([iv, authTag, encrypted]).toString('base64');
  } catch (err) {
    // Fail-closed: gravar o segredo em texto plano só porque a criptografia falhou esconderia o problema
    throw new Error(`Não foi possível criptografar um segredo: ${(err as Error).message}`);
  }
}

/**
 * Descriptografa um valor gravado por `encryptSecret`. Valores sem o prefixo `enc:v1:` são
 * tratados como texto plano já existente (compatibilidade com config.json de versões
 * anteriores a esta feature) e retornados sem alteração.
 */
export function decryptSecret(value: string | undefined, configDir: string): string | undefined {
  if (!value || !value.startsWith(ENC_PREFIX)) return value;
  try {
    const key = getOrCreateKey(configDir);
    const raw = Buffer.from(value.slice(ENC_PREFIX.length), 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf-8');
  } catch (err) {
    console.error('[secretsCrypto] Falha ao descriptografar segredo (chave ausente/corrompida?):', (err as Error).message);
    return '';
  }
}
