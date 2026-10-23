import { TourStep } from '../tourSteps';

export const WINTHOR_TOUR_STORAGE_KEY = 'devManager:tour:winthor';

export const WINTHOR_TOUR_STEPS: TourStep[] = [
  {
    target: 'winthor-header',
    title: 'WinThor & WSL',
    desc: 'Aqui ficam a stack WinThor (Oracle XE, WTA e WSH) e as distros WSL2. A lista de containers, grupos e o Compose continuam na tela Containers.'
  },
  {
    target: 'winthor-actions',
    title: 'Subir, Snapshots e INFR',
    desc: 'Subir WinThor inicia Oracle → WTA → WSH em sequência; Snapshots WSL importa/exporta distros; o Assistente INFR faz o bootstrap da stack.'
  }
];
