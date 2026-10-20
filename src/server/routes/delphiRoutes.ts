import express, { Router, Request, Response } from 'express';
import { DelphiBuildService } from '../../main/services/DelphiBuildService';

/** Build Delphi e pipeline no modo Web/Docker; o log do compilador segue pelo WebSocket (`delphi:log-chunk`). */
export function createDelphiRouter(
  delphiBuildService: DelphiBuildService,
  broadcast: (type: string, data: unknown) => void
): Router {
  const router = express.Router();
  const sendLog = (chunk: string) => broadcast('delphi:log-chunk', chunk);

  router.get('/installations', (_req: Request, res: Response) => {
    res.json(delphiBuildService.detectInstallations());
  });

  router.get('/projects', async (req: Request, res: Response) => {
    const root = typeof req.query.root === 'string' ? req.query.root : undefined;
    res.json(await delphiBuildService.findProjects(root));
  });

  router.post('/build', async (req: Request, res: Response) => {
    res.json(await delphiBuildService.build(req.body, sendLog));
  });

  router.post('/pipeline', async (req: Request, res: Response) => {
    res.json(await delphiBuildService.runPipeline(req.body, sendLog));
  });

  router.post('/cancel', async (_req: Request, res: Response) => {
    res.json({ success: await delphiBuildService.cancel() });
  });

  return router;
}
