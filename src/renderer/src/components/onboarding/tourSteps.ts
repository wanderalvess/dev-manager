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
    title: 'Bem-vindo ao Hub Manager 🚀',
    desc: 'Um tour rápido pelos principais recursos do Cockpit Integrado de Operação, Desenvolvimento e Qualidade. Leva menos de 1 minuto.'
  },
  {
    target: 'nav-infra',
    title: 'Infraestrutura & Ambiente',
    desc: 'Controle serviços do Windows, containers OSGi Karaf, perfis de deploy e acompanhe logs em tempo real.'
  },
  {
    target: 'nav-data',
    title: 'Banco de Dados & Rotinas',
    desc: 'Conecte a Oracle, MySQL ou Postgres e rode SQL direto daqui. O catálogo de rotinas guarda seus executáveis favoritos.'
  },
  {
    target: 'nav-dev',
    title: 'Desenvolvimento & DevOps',
    desc: 'Gerencie repositórios Git, branches e Pull Requests do Azure DevOps, e pesquise na documentação semântica (RAG).'
  },
  {
    target: 'nav-qa',
    title: 'Qualidade & Homologação',
    desc: 'Espaço dedicado para QA e homologação: validador regressivo Oracle, asserções de banco, matriz de testes e prontidão de release.'
  },
  {
    target: 'search',
    title: 'Busca Rápida',
    desc: 'Ctrl+K abre a busca rápida de rotinas, tabelas e ações — o jeito mais rápido de navegar sem tirar a mão do teclado.'
  },
  {
    target: 'status',
    title: 'Diagnósticos & Rede',
    desc: 'Veja seu IP local, IP do WSL e uso de CPU/RAM da máquina sem sair do cockpit.'
  },
  {
    target: 'help',
    title: 'Central de Ajuda',
    desc: 'Acesse documentação detalhada, tutoriais de cada módulo, FAQ e atalhos de teclado.'
  },
  {
    target: 'settings',
    title: 'Configurações',
    desc: 'Ajuste portas monitoradas, caminhos de ferramentas e conexões — tudo fica salvo localmente.'
  },
  {
    target: 'refresh',
    title: 'Atualizar Tudo',
    desc: 'Um clique para recarregar status de serviços, portas e repositórios Git.'
  }
];
