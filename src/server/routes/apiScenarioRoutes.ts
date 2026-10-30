import express, { Router, Request, Response } from 'express';
import type { ApiScenarioService } from '../../main/services/ApiScenarioService';

/** Validação de Cenários → Validação de API no modo Web/Docker. A validação da entrada é do service. */
export function createApiScenarioRouter(service: ApiScenarioService, broadcastWs: (type: string, data: unknown) => void): Router {
  const router = express.Router();
  const progress = (data: unknown) => broadcastWs('api-scenario:progress', data);

  router.get('/', async (_req: Request, res: Response) => {
    res.json(await service.list());
  });

  router.post('/', async (req: Request, res: Response) => {
    res.json(await service.save(req.body ?? {}));
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    res.json({ success: await service.delete(req.params.id) });
  });

  // POST porque cada chamada vai de verdade à API configurada e nunca deve ser cacheada
  router.post('/run', async (req: Request, res: Response) => {
    res.json(await service.run(req.body ?? {}, progress));
  });

  router.post('/run-all', async (_req: Request, res: Response) => {
    res.json(await service.runAll(progress));
  });

  return router;
}
