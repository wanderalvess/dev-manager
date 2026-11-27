import crypto from 'crypto';
import fs from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { wshInstallerUrl, type WshUpdateProbeResult } from '../../../shared/wshUpdate';

/** MD5 que o Google Cloud Storage informa no cabeçalho `x-goog-hash` (base64), em hexadecimal. */
export function md5FromGoogHash(header: string | null): string | undefined {
  const m = /(?:^|,\s*)md5=([A-Za-z0-9+/=]+)/.exec(header || '');
  return m ? Buffer.from(m[1], 'base64').toString('hex') : undefined;
}

type FetchLike = typeof fetch;

/** Só cabeçalhos: confirma que a versão existe e diz o tamanho, sem baixar nada. */
export async function probeInstaller(version: string, fetchImpl: FetchLike = fetch): Promise<WshUpdateProbeResult> {
  const url = wshInstallerUrl(version);
  try {
    const res = await fetchImpl(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
    if (res.status === 404 || res.status === 403) return { success: false, error: `A TOTVS não publicou a versão ${version} neste endereço.`, version, url };
    if (!res.ok) return { success: false, error: `O servidor respondeu ${res.status}.`, version, url };
    const length = Number(res.headers.get('content-length'));
    return { success: true, version, url, sizeBytes: Number.isFinite(length) ? length : undefined, lastModified: res.headers.get('last-modified') || undefined };
  } catch (err: any) {
    return { success: false, error: `Não foi possível consultar o servidor: ${err?.message || err}`, version, url };
  }
}

/**
 * Baixa o instalador para `target`, conferindo tamanho e MD5 do servidor. Escreve num `.part` e só renomeia
 * quando tudo confere, para não deixar um arquivo parcial passando por completo.
 */
export async function downloadInstaller(
  version: string,
  target: string,
  onProgress: (percent: number | undefined, doneBytes: number) => void,
  fetchImpl: FetchLike = fetch
): Promise<{ sizeBytes: number; md5: string }> {
  const res = await fetchImpl(wshInstallerUrl(version), { signal: AbortSignal.timeout(15 * 60 * 1000) });
  if (!res.ok || !res.body) throw new Error(`O download falhou (HTTP ${res.status}).`);
  const total = Number(res.headers.get('content-length')) || undefined;
  const expectedMd5 = md5FromGoogHash(res.headers.get('x-goog-hash'));
  const hash = crypto.createHash('md5');
  let done = 0;
  let lastPercent = -1;

  const meter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      hash.update(chunk);
      done += chunk.length;
      const percent = total ? Math.floor((done / total) * 100) : undefined;
      if (percent !== lastPercent) {
        lastPercent = percent ?? -1;
        onProgress(percent, done);
      }
      cb(null, chunk);
    }
  });

  const part = `${target}.part`;
  try {
    await pipeline(Readable.fromWeb(res.body as never), meter, fs.createWriteStream(part));
    const md5 = hash.digest('hex');
    if (total && done !== total) throw new Error(`Download incompleto (${done} de ${total} bytes).`);
    if (expectedMd5 && md5 !== expectedMd5) throw new Error('O MD5 do arquivo baixado não confere com o do servidor.');
    fs.renameSync(part, target);
    return { sizeBytes: done, md5 };
  } catch (err) {
    fs.rmSync(part, { force: true });
    throw err;
  }
}
