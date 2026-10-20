import express, { Router, Request, Response } from 'express';
import { AzurePipelineService } from '../../main/services/AzurePipelineService';

/** Artefatos do Azure Pipelines no modo Web/Docker. O service valida org/projeto/build. */
export function createAzurePipelineRouter(azurePipelineService: AzurePipelineService): Router {
  const router = express.Router();

  router.post('/builds', async (req: Request, res: Response) => {
    const { target, options } = req.body || {};
    res.json(await azurePipelineService.listBuilds(target, options));
  });

  router.post('/artifacts', async (req: Request, res: Response) => {
    const { target, buildId } = req.body || {};
    res.json(await azurePipelineService.listArtifacts(target, Number(buildId)));
  });

  router.post('/download', async (req: Request, res: Response) => {
    const { target, buildId, buildNumber, artifactName } = req.body || {};
    res.json(await azurePipelineService.downloadArtifact(target, Number(buildId), String(buildNumber ?? ''), artifactName));
  });

  router.get('/artifacts-dir', (_req: Request, res: Response) => {
    res.json({ dir: azurePipelineService.getArtifactsDir() });
  });

  return router;
}
