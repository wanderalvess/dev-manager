import { TourStep } from '../tourSteps';

export const KARAF_TOUR_STORAGE_KEY = 'devManager:tour:karaf';

export const KARAF_TOUR_STEPS: TourStep[] = [
  {
    target: 'karaf-tools',
    title: 'Ferramentas do Karaf',
    desc: 'Cada cartão abre um painel: Bundles OSGi, Features e repositórios, Catálogo 801 e Memória da JVM.'
  },
  {
    target: 'console-dock',
    title: 'Console do Karaf',
    desc: 'O console fica no rodapé de qualquer tela (Ctrl+`). Os diagnósticos desta tela escrevem a saída nele.'
  }
];
