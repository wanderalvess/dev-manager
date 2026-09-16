import { TourStep } from '../tourSteps';

export const CONTAINERS_TOUR_STORAGE_KEY = 'devManager:tour:containers';

export const CONTAINERS_TOUR_STEPS: TourStep[] = [
  {
    target: 'page-header',
    title: 'Painel de Containers e WSL',
    desc: 'Aqui você acompanha o status do Docker/Podman e gerencia containers e distros WSL do seu ambiente de desenvolvimento.'
  },
  {
    target: 'compose-panel',
    title: 'Docker Compose',
    desc: 'Suba, derrube ou consulte o status dos serviços de um arquivo docker-compose.yml diretamente por aqui.'
  },
  {
    target: 'container-list',
    title: 'Lista de Containers',
    desc: 'Todos os containers detectados aparecem aqui, com nome, imagem, portas e status atualizados em tempo real.'
  },
  {
    target: 'container-stats',
    title: 'Métricas de Uso',
    desc: 'Enquanto o container está rodando, você vê o consumo de CPU e memória atualizados a cada poucos segundos.'
  },
  {
    target: 'container-actions',
    title: 'Iniciar, Parar e Reiniciar',
    desc: 'Use estes botões para controlar o ciclo de vida do container: iniciar quando parado, ou parar/reiniciar quando em execução.'
  },
  {
    target: 'container-terminal',
    title: 'Terminal Interativo',
    desc: 'Abre um terminal bash dentro do container para executar comandos diretamente nele.'
  },
  {
    target: 'container-logs',
    title: 'Visualizar Logs',
    desc: 'Abre um modal com os logs recentes do container, permitindo ajustar a quantidade de linhas e copiar o conteúdo.'
  }
];
