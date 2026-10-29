import express, { Router, Request, Response } from 'express';
import type { ConfigService } from '../../main/services/ConfigService';
import { getKarafInstallStatus } from '../../main/services/karaf/karafInstallInfo';

/** O que o etc/ da instalação do Karaf diz (portas, log, JDK, serviço Windows). Só leitura. */
export function createKarafInstallRouter(configService: ConfigService): Router {
  const router = express.Router();
  router.get('/', (_req: Request, res: Response) => {
    res.json(getKarafInstallStatus(configService.getSettings()));
  });
  return router;
}
