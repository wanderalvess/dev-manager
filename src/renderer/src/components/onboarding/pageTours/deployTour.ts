import { TourStep } from '../tourSteps';

export const DEPLOY_TOUR_STORAGE_KEY = 'devManager:tour:deploy';

export const DEPLOY_TOUR_STEPS: TourStep[] = [
  {
    target: 'select-deploy-profile',
    title: 'Selecionar Perfil de Deploy',
    desc: 'Escolha qual perfil de deploy (Karaf, Docker ou Genérico) será usado.'
  },
  {
    target: 'edit-deploy-profile',
    title: 'Editar Perfil Ativo',
    desc: 'Abre o modal para renomear o perfil e ajustar suas configurações gerais.'
  },
  {
    target: 'profile-menu-options',
    title: 'Mais Opções de Perfil',
    desc: 'Cria um novo perfil do zero ou duplica o perfil atual como ponto de partida.'
  },
  {
    target: 'steps-list-panel',
    title: 'Sequência de Etapas',
    desc: 'Mostra as etapas configuradas, na ordem em que serão executadas durante o deploy.'
  },
  {
    target: 'run-single-step',
    title: 'Executar Etapa Individual',
    desc: 'Roda somente essa etapa isoladamente, sem executar o perfil inteiro.'
  },
  {
    target: 'run-active-profile',
    title: 'Executar Perfil Completo',
    desc: 'Dispara todas as etapas do perfil ativo em sequência, uma após a outra.'
  },
  {
    target: 'deploy-console-output',
    title: 'Console de Saída',
    desc: 'Exibe em tempo real os logs do deploy ou das etapas sendo executadas.'
  }
];
