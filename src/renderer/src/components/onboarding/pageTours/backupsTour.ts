import { TourStep } from '../tourSteps';

export const BACKUPS_TOUR_STORAGE_KEY = 'devManager:tour:backups';

export const BACKUPS_TOUR_STEPS: TourStep[] = [
  {
    target: 'backups-connection',
    title: 'Conexão do Backup',
    desc: 'Escolha de qual banco fazer backup. Quem abre esta tela pelo botão Backup do Studio SQL já chega na conexão que estava ativa.'
  }
];
