import express, { Router, Request, Response } from 'express';
import type { KnowledgeBaseService } from '../../main/services/kb/KnowledgeBaseService';

/** Base de Conhecimento compartilhada no modo Web/Docker. A importação envia só a pasta configurada. */
export function createKnowledgeBaseRouter(
  service: KnowledgeBaseService,
  broadcastWs: (type: string, data: unknown) => void
): Router {
  const router = express.Router();

  router.get('/status', (_req: Request, res: Response) => {
    res.json(service.getStatus());
  });
  router.post('/search', async (req: Request, res: Response) => {
    res.json(await service.search(req.body ?? {}));
  });
  router.post('/ask', async (req: Request, res: Response) => {
    res.json(await service.ask(req.body ?? {}));
  });
  router.get('/divergences', async (req: Request, res: Response) => {
    const module = typeof req.query.module === 'string' ? req.query.module : undefined;
    const limit = Number(req.query.limit) || undefined;
    res.json(await service.divergences(module, limit));
  });
  router.post('/import', async (req: Request, res: Response) => {
    const version = typeof req.body?.version === 'string' ? req.body.version : undefined;
    res.json(await service.importFolder({ version, onProgress: (p) => broadcastWs('kb:import-progress', p) }));
  });

  return router;
}
