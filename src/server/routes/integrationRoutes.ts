import express, { Router, Request, Response } from 'express';
import type { IntegrationTraceService } from '../../main/services/IntegrationTraceService';

/** Rastreio de Integração ponta a ponta (decisão 0003) no modo Web/Docker. */
export function createIntegrationRouter(integrationTraceService: IntegrationTraceService): Router {
  const router = express.Router();

  // POST porque cada chamada executa verificações de verdade (rede, banco, login) e nunca deve ser cacheada
  router.post('/readiness', async (_req: Request, res: Response) => {
    res.json(await integrationTraceService.checkReadiness());
  });

  return router;
}
