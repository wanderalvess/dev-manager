import http from 'http';
import https from 'https';

export interface SimpleHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
}

/**
 * Executa requisição HTTP/HTTPS com suporte a certificados corporativos autoassinados
 * (Zscaler, proxy TOTVS, etc). Extraído do sync de documentação RAG para ser reutilizado
 * por qualquer integração de webhook/endpoint externo (ex: notificações de backup).
 */
export async function httpRequest(
  urlStr: string,
  options: { method: string; headers: Record<string, string>; body?: string }
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
            const bodyText = Buffer.concat(chunks).toString('utf-8');
            const statusCode = res.statusCode || 200;
            resolve({
              ok: statusCode >= 200 && statusCode < 300,
              status: statusCode,
              statusText: res.statusMessage || `${statusCode}`,
              text: async () => bodyText
            });
          });
        }
      );

      req.on('error', (err) => {
        reject(err);
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}
