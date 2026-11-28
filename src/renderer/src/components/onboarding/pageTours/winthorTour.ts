import { TourStep } from '../tourSteps';

export const WINTHOR_TOUR_STORAGE_KEY = 'devManager:tour:winthor';

export const WINTHOR_TOUR_STEPS: TourStep[] = [
  {
    target: 'winthor-header',
    title: 'WinThor & WSL',
    desc: 'Aqui fica o ambiente WinThor: banco Oracle, WTA e WSH em containers no WSL. O painel logo abaixo diz o que fazer agora (ligar o Docker, criar, subir ou abrir o portal). A lista geral de containers, grupos e o Compose ficam na tela Containers.'
  },
  {
    target: 'winthor-actions',
    title: 'Subir, Snapshots e INFR',
    desc: 'Subir WinThor liga o banco, o WTA e o WSH em sequência. Snapshots WSL é o backup da distro (.tar). O Assistente INFR cria ou conserta o ambiente passo a passo.'
  }
];
