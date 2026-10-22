import express, { Router, Request, Response } from 'express';
import { PomGraphService } from '../../main/services/PomGraphService';

/** Projetos Maven do workspace para montar a fila de deploy (modo Web/Docker). */
export function createDeployWorkspaceRouter(pomGraphService: PomGraphService): Router {
  const router = express.Router();

  router.get('/scan-workspace', (_req: Request, res: Response) => {
    res.json(pomGraphService.scanWorkspace());
  });

  return router;
}
