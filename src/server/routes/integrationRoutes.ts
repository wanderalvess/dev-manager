import express, { Router, Request, Response } from 'express';
import type { IntegrationTraceService } from '../../main/services/IntegrationTraceService';

/** Rastreio de Integração ponta a ponta (decisão 0003) no modo Web/Docker. */
export function createIntegrationRouter(integrationTraceService: IntegrationTraceService): Router {
  const router = express.Router();

  // POST porque cada chamada executa verificações de verdade (rede, banco, login) e nunca deve ser cacheada
  router.post('/readiness', async (_req: Request, res: Response) => {
    res.json(await integrationTraceService.checkReadiness());
  });

  router.get('/flows', (_req: Request, res: Response) => {
    res.json(integrationTraceService.listFlows());
  });

  // A validação da entrada é do service: erro volta como { success: false, error }, igual aos outros transportes
  router.post('/trace', async (req: Request, res: Response) => {
    res.json(await integrationTraceService.traceBatch(req.body ?? {}));
  });

  router.get('/traces', async (_req: Request, res: Response) => {
    res.json(await integrationTraceService.listTraces());
  });

  router.get('/traces/:id', async (req: Request, res: Response) => {
    const trace = await integrationTraceService.getTrace(req.params.id);
    if (!trace) {
      res.status(404).json({ error: 'Rastreio não encontrado.' });
      return;
    }
    res.json(trace);
  });

  router.delete('/traces/:id', async (req: Request, res: Response) => {
    res.json({ success: await integrationTraceService.deleteTrace(req.params.id) });
  });

  return router;
}
