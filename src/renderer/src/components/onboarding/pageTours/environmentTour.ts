import { TourStep } from '../tourSteps';

export const ENV_TOUR_STORAGE_KEY = 'devManager:tour:env';

export const ENV_TOUR_STEPS: TourStep[] = [
  {
    target: 'profile-selector',
    title: 'Escolha seu Perfil',
    desc: 'Selecione qual perfil de automação (conjunto de etapas) você quer visualizar e executar.'
  },
  {
    target: 'profile-toolbar',
    title: 'Gerencie seus Perfis',
    desc: 'Crie, edite, duplique, exporte ou importe perfis de automação para reaproveitar suas esteiras.'
  },
  {
    target: 'run-profile-button',
    title: 'Suba o Ambiente',
    desc: 'Executa todas as etapas do perfil ativo em sequência, uma após a outra.'
  },
  {
    target: 'profile-stepper',
    title: 'Acompanhe o Progresso',
    desc: 'Mostra visualmente em qual etapa da esteira o ambiente está durante a execução.'
  },
  {
    target: 'ports-monitor',
    title: 'Monitor de Portas',
    desc: 'Mostra em tempo real quais portas do ambiente estão ativas ou livres.'
  },
  {
    target: 'step-cards-panel',
    title: 'Detalhes de Cada Etapa',
    desc: 'Cada cartão representa um serviço ou comando da esteira, com botões para subir, parar ou reiniciar individualmente.'
  },
  {
    target: 'console-dock',
    title: 'Console em Tempo Real',
    desc: 'O console fica no rodapé de qualquer tela (Ctrl+`): acompanhe os logs e envie comandos diretamente ao Karaf.'
  }
];
