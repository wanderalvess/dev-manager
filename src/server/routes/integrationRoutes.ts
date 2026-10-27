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

  // Reconsulta do modo ao vivo; não está na lista de ações rastreadas de propósito (acompanhar não é um uso novo)
  router.post('/traces/:id/refresh', async (req: Request, res: Response) => {
    res.json(await integrationTraceService.refreshTrace(req.params.id));
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

  // Monitor do WSH: só leitura na PCINTEGRACAOCORE; POST na busca para os filtros irem no corpo
  router.get('/wsh/routes', async (_req: Request, res: Response) => {
    res.json(await integrationTraceService.listWshRoutes());
  });

  router.post('/wsh/search', async (req: Request, res: Response) => {
    res.json(await integrationTraceService.searchWsh(req.body ?? {}));
  });

  router.post('/wsh/dependencies', async (req: Request, res: Response) => {
    res.json(await integrationTraceService.checkWshDependencies(String(req.body?.route ?? '')));
  });

  router.post('/wsh/layout', async (req: Request, res: Response) => {
    res.json(await integrationTraceService.explainWshLayout(req.body ?? {}));
  });

  return router;
}
