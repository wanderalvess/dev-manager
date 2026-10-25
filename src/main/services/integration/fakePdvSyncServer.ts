import http from 'http';
import type { AddressInfo } from 'net';

/**
 * Servidor falso do PDVSync, só para testes: um servidor HTTP de verdade que imita o contrato dos layouts do WSH
 * (login RAC por senha, `LoteExternoRetornos` e `LojaLoteStatusretorno`). Ele existe para os testes não dependerem
 * da nuvem da TOTVS nem de credenciais reais.
 */

export const FAKE_CREDENTIALS = {
  username: 'svc-hub',
  password: 'senha-do-servico',
  clientId: 'cliente-hub',
  clientSecret: 'segredo-do-cliente',
  token: 'token-falso-123'
} as const;

export interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: http.IncomingHttpHeaders;
  body: string;
}

interface FakeBatch {
  status: unknown;
}

const BATCHES: Record<string, FakeBatch> = {
  '100': { status: 5 },
  '101': { status: '4.0' },
  '102': { status: 6 },
  '103': { status: 0 }
};

/** Status por loja do lote 100: loja 1 baixou; a loja 2 baixou com erro e traz o motivo. */
const STORES_100 = [
  { idRetaguardaLoja: 1, status: 5, errosIdentificados: [] },
  { idRetaguardaLoja: 2, status: '6.0', errosIdentificados: [{ idRetaguarda: 'PROD-7', erro: 'NCM inválido para o produto' }] }
];

/**
 * Lote 200: as lojas terminam de baixar com o tempo. Nas duas primeiras consultas do lote ele está em EmProcessoDeBaixa
 * com a loja 2 ainda baixando; da terceira em diante, BaixadoComSucesso nas duas. Serve para o modo ao vivo.
 */
export const PROGRESSIVE_BATCH = '200';
const PROGRESSIVE_DONE_AFTER = 2;

export interface FakePdvSync {
  baseUrl: string;
  racUrl: string;
  batchStatusUrl: string;
  storeStatusUrl: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export async function startFakePdvSync(): Promise<FakePdvSync> {
  const requests: RecordedRequest[] = [];
  let progressiveCalls = 0;
  const progressiveDone = () => progressiveCalls > PROGRESSIVE_DONE_AFTER;

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const url = new URL(req.url ?? '/', 'http://fake');
      const body = Buffer.concat(chunks).toString('utf-8');
      requests.push({ method: req.method ?? '', path: decodeURIComponent(url.pathname), query: Object.fromEntries(url.searchParams), headers: req.headers, body });

      // Login "bem-sucedido" que esquece o access_token: o cliente precisa tratar como erro
      if (req.method === 'POST' && url.pathname === '/rac/sem-token') return send(res, 200, { expires_in: 1200 });

      if (req.method === 'POST' && url.pathname === '/rac/token') {
        const form = new URLSearchParams(body);
        const valid =
          form.get('grant_type') === 'password' &&
          form.get('scope') === 'authorization_api' &&
          form.get('username') === FAKE_CREDENTIALS.username &&
          form.get('password') === FAKE_CREDENTIALS.password &&
          form.get('client_id') === FAKE_CREDENTIALS.clientId &&
          form.get('client_secret') === FAKE_CREDENTIALS.clientSecret;
        if (!valid) return send(res, 401, { error: 'invalid_grant', error_description: 'Usuário ou senha inválidos' });
        return send(res, 200, { access_token: FAKE_CREDENTIALS.token, token_type: 'bearer', expires_in: 1200 });
      }

      if (req.headers.authorization !== `Bearer ${FAKE_CREDENTIALS.token}`) {
        return send(res, 401, { message: 'Token ausente ou inválido' });
      }

      const batchMatch = url.pathname.match(/^\/controleprocesso\/api\/retaguarda\/v3\/LoteExternoRetornos\/([^/]+)\/([^/]+)$/);
      if (req.method === 'GET' && batchMatch) {
        const lote = decodeURIComponent(batchMatch[2]);
        if (lote === 'quebra') return send(res, 500, { message: 'falha interna do serviço' });
        if (lote === 'vazio') return send(res, 200, { data: [] });
        if (lote === PROGRESSIVE_BATCH) {
          progressiveCalls += 1;
          return send(res, 200, { data: [{ loteOrigem: lote, status: progressiveDone() ? 5 : 4 }] });
        }
        const batch = BATCHES[lote];
        if (!batch) return send(res, 404, { message: 'Lote não encontrado' });
        return send(res, 200, { data: [{ loteOrigem: lote, status: batch.status }] });
      }

      if (req.method === 'GET' && url.pathname === '/controle/api/retaguarda/v3/LojaLoteStatusretorno') {
        const lote = url.searchParams.get('loteOrigem') ?? '';
        if (lote === 'quebra') return send(res, 500, { message: 'falha no status por loja' });
        if (lote === PROGRESSIVE_BATCH) {
          const loja2 = progressiveDone() ? 5 : 4;
          const lojaLotes = [
            { idRetaguardaLoja: 1, status: 5, errosIdentificados: [] },
            { idRetaguardaLoja: 2, status: loja2, errosIdentificados: [] }
          ];
          return send(res, 200, { data: { loteOrigem: lote, lojaLotes } });
        }
        if (lote !== '100') return send(res, 200, { data: { loteOrigem: lote, lojaLotes: [] } });
        const filial = url.searchParams.get('idRetaguardaLoja');
        const stores = filial ? STORES_100.filter((store) => String(store.idRetaguardaLoja) === filial) : STORES_100;
        return send(res, 200, { data: { lote: 'abc', loteOrigem: lote, lojaLotes: stores } });
      }

      return send(res, 404, { message: 'rota desconhecida' });
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    baseUrl,
    racUrl: `${baseUrl}/rac/token`,
    batchStatusUrl: `${baseUrl}/controleprocesso/api/retaguarda/v3/LoteExternoRetornos`,
    storeStatusUrl: `${baseUrl}/controle/api/retaguarda/v3/LojaLoteStatusretorno`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}
