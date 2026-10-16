import express, { Router, Request, Response } from 'express';
import { HttpClientService } from '../../main/services/HttpClientService';
import { HttpCollectionService } from '../../main/services/HttpCollectionService';

export function createHttpClientRouter(
  httpClientService: HttpClientService,
  httpCollectionService: HttpCollectionService
): Router {
  const router = express.Router();

  router.post('/execute', async (req: Request, res: Response) => {
    const result = await httpClientService.executeRequest(req.body);
    res.json(result);
  });

  router.get('/collections', async (_req: Request, res: Response) => {
    const collections = httpCollectionService.getCollections();
    res.json(collections);
  });

  router.post('/collections', async (req: Request, res: Response) => {
    const saved = httpCollectionService.saveCollection(req.body);
    res.json(saved);
  });

  router.delete('/collections/:id', async (req: Request, res: Response) => {
    const deleted = httpCollectionService.deleteCollection(req.params.id);
    res.json({ success: deleted });
  });

  router.post('/requests', async (req: Request, res: Response) => {
    const saved = httpCollectionService.saveRequest(req.body);
    res.json(saved);
  });

  router.delete('/requests/:collectionId/:requestId', async (req: Request, res: Response) => {
    const deleted = httpCollectionService.deleteRequest(req.params.collectionId, req.params.requestId);
    res.json({ success: deleted });
  });

  router.post('/import-postman', async (req: Request, res: Response) => {
    const jsonContent = typeof req.body === 'string' ? req.body : req.body.jsonContent;
    const result = httpCollectionService.importPostman(jsonContent || '');
    res.json(result);
  });

  router.get('/environments', async (_req: Request, res: Response) => {
    const envs = httpCollectionService.getEnvironments();
    res.json(envs);
  });

  router.post('/environments', async (req: Request, res: Response) => {
    httpCollectionService.saveEnvironments(req.body);
    res.json({ success: true });
  });

  router.post('/login-winthor', async (req: Request, res: Response) => {
    const result = await httpClientService.loginWinThor(req.body);
    res.json(result);
  });

  router.get('/history', async (_req: Request, res: Response) => {
    const history = httpClientService.getHistory();
    res.json(history);
  });

  router.post('/history/clear', async (_req: Request, res: Response) => {
    httpClientService.clearHistory();
    res.json({ success: true });
  });

  return router;
}
