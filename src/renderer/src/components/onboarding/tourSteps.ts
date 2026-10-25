export interface TourStep {
  /** data-tour do elemento alvo, ou null para passo de boas-vindas sem spotlight */
  target: string | null;
  title: string;
  desc: string;
}

export const TOUR_STORAGE_KEY = 'devManager:onboardingTourV2';

export const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: 'Onde fica cada coisa',
    desc: 'Um passeio de menos de 1 minuto pelo menu lateral e pelo cabeçalho: os grupos de páginas, a busca e os atalhos que você vai usar todo dia.'
  },
  {
    target: 'nav-infra',
    title: 'Infraestrutura & Ambiente',
    desc: 'Serviços e esteira do ambiente, containers, deploy, logs em tempo real e APM.'
  },
  {
    target: 'nav-data',
    title: 'Banco de Dados & Rotinas',
    desc: 'SQL runner e backups de Oracle, MySQL e Postgres, e o catálogo de rotinas WinThor.'
  },
  {
    target: 'nav-dev',
    title: 'Desenvolvimento & DevOps',
    desc: 'Git e Azure DevOps, documentação semântica (RAG) e o API Studio.'
  },
  {
    target: 'nav-qa',
    title: 'Qualidade & Homologação',
    desc: 'Homologação, Validador Regressivo, Test Runners e TAUT (Cypress).'
  },
  {
    target: 'nav-integrations',
    title: 'Integrações',
    desc: 'MCP, provedores de LLM, Azure DevOps, Jira, Confluence e mais, com o estado de cada uma e um atalho para configurá-la.'
  },
  {
    target: 'search',
    title: 'Busca Rápida',
    desc: 'Ctrl+K encontra páginas, rotinas, repositórios e ações sem tirar a mão do teclado.'
  },
  {
    target: 'status',
    title: 'Diagnósticos & Rede',
    desc: 'IP local, IP do WSL e uso de CPU/RAM da máquina, sempre à vista.'
  },
  {
    target: 'help',
    title: 'Central de Ajuda',
    desc: 'Tutoriais de cada módulo, FAQ, atalhos de teclado — e o botão para refazer este tour.'
  },
  {
    target: 'settings',
    title: 'Configurações',
    desc: 'Caminhos, portas, conexões e integrações. Em Módulos você liga ou desliga as páginas do menu lateral.'
  },
  {
    target: 'refresh',
    title: 'Atualizar Tudo',
    desc: 'Recarrega de uma vez o status de serviços, portas e repositórios Git.'
  }
];
