import http from 'http';
import https from 'https';

export interface SimpleHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  /** Corpo bruto, sem decodificar como texto — necessário pra baixar binários (PDF, DOCX, imagens). */
  buffer: () => Promise<Buffer>;
}

/**
 * Executa requisição HTTP/HTTPS com suporte a certificados corporativos autoassinados
 * (Zscaler, proxy TOTVS, etc). Extraído do sync de documentação RAG para ser reutilizado
 * por qualquer integração de webhook/endpoint externo (ex: notificações de backup).
 */
export async function httpRequest(
  urlStr: string,
  options: { method: string; headers: Record<string, string>; body?: string; timeout?: number }
): Promise<SimpleHttpResponse> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(urlStr);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(
        urlStr,
        {
          method: options.method,
          headers: options.headers,
          // Em redes corporativas com proxy SSL inspect, evita erro "self signed certificate in certificate chain"
          rejectUnauthorized: false
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => {
            const bodyBuffer = Buffer.concat(chunks);
            const statusCode = res.statusCode || 200;
            resolve({
              ok: statusCode >= 200 && statusCode < 300,
              status: statusCode,
              statusText: res.statusMessage || `${statusCode}`,
              text: async () => bodyBuffer.toString('utf-8'),
              buffer: async () => bodyBuffer
            });
          });
        }
      );

      req.on('error', (err) => {
        reject(err);
      });

      if (options.timeout && options.timeout > 0) {
        req.setTimeout(options.timeout, () => {
          req.destroy(new Error(`Timeout de requisição HTTP excedido (${options.timeout}ms)`));
        });
      }

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}
