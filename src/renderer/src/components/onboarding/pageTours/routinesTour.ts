import { TourStep } from '../tourSteps';

export const ROUTINES_TOUR_STORAGE_KEY = 'devManager:tour:routines';

export const ROUTINES_TOUR_STEPS: TourStep[] = [
  {
    target: 'catalogo-rotinas',
    title: 'Catálogo de Rotinas',
    desc: 'Aqui você vê todos os executáveis encontrados na pasta configurada de rotinas.'
  },
  {
    target: 'busca-rotina',
    title: 'Busca Rápida',
    desc: 'Digite parte do número ou nome para filtrar as rotinas instantaneamente.'
  },
  {
    target: 'filtro-modulo',
    title: 'Filtrar por Módulo',
    desc: 'Restrinja a lista às rotinas de um módulo específico do sistema.'
  },
  {
    target: 'atualizar-catalogo',
    title: 'Atualizar Catálogo',
    desc: 'Reescaneia a pasta configurada para encontrar novas rotinas adicionadas.'
  },
  {
    target: 'rotinas-favoritas',
    title: 'Rotinas Favoritas',
    desc: 'Rotinas marcadas com estrela aparecem aqui no topo, para acesso mais rápido.'
  },
  {
    target: 'favoritar-rotina',
    title: 'Marcar como Favorita',
    desc: 'Clique na estrela de qualquer rotina para fixá-la na seção de favoritos.'
  },
  {
    target: 'executar-rotina',
    title: 'Executar Rotina',
    desc: 'Inicia o executável dessa rotina diretamente no Windows com um clique.'
  }
];
