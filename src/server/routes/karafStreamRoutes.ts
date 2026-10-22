import express, { Router, Request, Response } from 'express';
import { KarafService } from '../../main/services/KarafService';

/** log:tail ao vivo no modo Web/Docker: a saída segue por `karaf:log-chunk` e o fim por `karaf:stream-end` (WebSocket). */
export function createKarafStreamRouter(
  karafService: KarafService,
  broadcast: (type: string, data: unknown) => void
): Router {
  const router = express.Router();

  router.post('/start', async (req: Request, res: Response) => {
    const { command } = req.body || {};
    const result = await karafService.startKarafStream(
      String(command ?? ''),
      (chunk) => broadcast('karaf:log-chunk', chunk),
      (id, code) => broadcast('karaf:stream-end', { id, code })
    );
    res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/stop', (req: Request, res: Response) => {
    res.json({ success: karafService.stopKarafStream(String(req.body?.id ?? '')) });
  });

  return router;
}
