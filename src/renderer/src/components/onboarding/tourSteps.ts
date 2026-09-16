export interface TourStep {
  /** data-tour do elemento alvo, ou null para passo de boas-vindas sem spotlight */
  target: string | null;
  title: string;
  desc: string;
}

export const TOUR_STORAGE_KEY = 'devManager:onboardingTourV1';

export const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: 'Bem-vindo ao Dev Manager 🚀',
    desc: 'Um tour rápido pelos principais recursos do cockpit de desenvolvimento. Leva menos de 1 minuto.'
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
    title: 'Desenvolvimento & Suporte',
    desc: 'Gerencie repositórios Git e Pull Requests do Azure DevOps, pesquise na documentação semântica (RAG) e consulte a Central de Ajuda.'
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
