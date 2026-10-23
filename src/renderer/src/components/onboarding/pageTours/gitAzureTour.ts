import { TourStep } from '../tourSteps';

export const GIT_TOUR_STORAGE_KEY = 'devManager:tour:git';

export const GIT_TOUR_STEPS: TourStep[] = [
  {
    target: 'repo-list',
    title: 'Lista de Repositórios',
    desc: 'Escolha o repositório clicando em um item. Os chips (Todos, Com alterações, Só locais, Sem push) filtram a lista, e cada cartão mostra se a branch é só local, quantos commits estão sem push e quantas alterações pendentes há.'
  },
  {
    target: 'branch-atual',
    title: 'Branch Atual',
    desc: 'Mostra em qual branch o repositório selecionado está posicionado no momento.'
  },
  {
    target: 'trocar-branch',
    title: 'Trocar ou Criar Branch',
    desc: 'Abre um modal para alternar para outra branch existente ou criar uma nova a partir da atual.'
  },
  {
    target: 'commit-push',
    title: 'Commit e Push Rápido',
    desc: 'Salva suas alterações locais e envia direto para o repositório remoto em poucos cliques.'
  },
  {
    target: 'acoes-sync',
    title: 'Sincronizar com o Remoto',
    desc: 'Use Fetch para atualizar referências remotas ou Pull para baixar e mesclar as últimas alterações.'
  },
  {
    target: 'selecionar-branch-destino',
    title: 'Escolher Branch de Destino',
    desc: 'Define para qual branch (develop, master, etc.) o Pull Request será direcionado.'
  },
  {
    target: 'criar-pull-request',
    title: 'Criar Pull Request',
    desc: 'Abre o formulário de Pull Request (ou Merge Request) direto no Azure DevOps, GitHub ou GitLab. Se a branch ainda estiver só no seu computador, o Hub oferece publicá-la no origin antes.'
  }
];
