import { TourStep } from '../tourSteps';

export const LOGS_TOUR_STORAGE_KEY = 'devManager:tour:logs';

export const LOGS_TOUR_STEPS: TourStep[] = [
  {
    target: 'selecionar-fonte-log',
    title: 'Seletor de Fontes',
    desc: 'Escolha qual arquivo de log você está visualizando entre as fontes cadastradas.'
  },
  {
    target: 'gerenciar-fontes',
    title: 'Gerenciar Fontes',
    desc: 'Cadastre, edite ou remova arquivos de log que o Dev Manager acompanha.'
  },
  {
    target: 'status-conexao-live',
    title: 'Status da Transmissão',
    desc: 'Indica se o arquivo existe e se o log está sendo transmitido ao vivo.'
  },
  {
    target: 'campo-busca-logs',
    title: 'Buscar nos Logs',
    desc: 'Filtre as linhas exibidas digitando um termo, com opções de maiúsculas, regex e inversão.'
  },
  {
    target: 'filtro-severidade',
    title: 'Filtrar por Nível',
    desc: 'Mostre apenas linhas de um nível específico, como ERROR ou WARN, com contadores em tempo real.'
  },
  {
    target: 'console-live-tail',
    title: 'Console em Tempo Real',
    desc: 'Área onde as linhas do log aparecem ao vivo, coloridas por severidade e com destaque de busca.'
  },
  {
    target: 'acoes-limpar-exportar',
    title: 'Copiar e Exportar',
    desc: 'Copie as linhas filtradas ou baixe um arquivo .txt com o log atual para compartilhar ou analisar depois.'
  }
];
