import express, { Router, Request, Response } from 'express';
import type { ScenarioHistoryService } from '../../main/services/ScenarioHistoryService';

/** Histórico da Validação de Cenários no modo Web/Docker. */
export function createScenarioHistoryRouter(service: ScenarioHistoryService): Router {
  const router = express.Router();

  router.get('/', async (req: Request, res: Response) => {
    const kind = req.query.kind === 'auth-lockout' || req.query.kind === 'api' ? req.query.kind : undefined;
    res.json(await service.list(kind));
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const record = await service.get(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Execução não encontrada.' });
      return;
    }
    res.json(record);
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    res.json({ success: await service.remove(req.params.id) });
  });

  router.delete('/', async (_req: Request, res: Response) => {
    res.json({ removed: await service.clear() });
  });

  return router;
}
