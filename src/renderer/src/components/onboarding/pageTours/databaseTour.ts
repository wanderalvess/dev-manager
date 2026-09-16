import { TourStep } from '../tourSteps';

export const DATABASE_TOUR_STORAGE_KEY = 'devManager:tour:database';

export const DATABASE_TOUR_STEPS: TourStep[] = [
  {
    target: 'connections-sidebar',
    title: 'Suas Conexões',
    desc: 'Aqui ficam suas conexões salvas com bancos Oracle, MySQL e Postgres; clique em uma para ativá-la.'
  },
  {
    target: 'new-connection-button',
    title: 'Criar Nova Conexão',
    desc: 'Clique aqui para cadastrar uma nova conexão de banco de dados, informando host, porta e credenciais.'
  },
  {
    target: 'table-explorer',
    title: 'Explorador de Tabelas',
    desc: 'Lista as tabelas do banco ativo; clique em uma para gerar um SELECT rápido ou expanda para ver suas colunas.'
  },
  {
    target: 'sql-editor',
    title: 'Editor de Comandos SQL',
    desc: 'Digite ou cole aqui qualquer comando SQL para executar diretamente no banco conectado.'
  },
  {
    target: 'execute-sql-button',
    title: 'Executar Consulta',
    desc: 'Executa o comando SQL do editor no banco ativo (atalho Ctrl+Enter).'
  },
  {
    target: 'results-panel',
    title: 'Painel de Resultados',
    desc: 'Mostra os dados retornados pela consulta, com filtros, ordenação e exportação para CSV.'
  },
  {
    target: 'backup-button',
    title: 'Backup e Agendamento',
    desc: 'Abre o gerenciador de backups, permitindo rodar backups manuais, agendar execuções automáticas e restaurar arquivos.'
  }
];
