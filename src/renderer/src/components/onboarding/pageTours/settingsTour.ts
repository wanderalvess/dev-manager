import { TourStep } from '../tourSteps';

export const SETTINGS_TOUR_STORAGE_KEY = 'devManager:tour:settings';

export const SETTINGS_TOUR_STEPS: TourStep[] = [
  {
    target: 'tabs-nav-dirs',
    title: 'Abas de Configuração',
    desc: 'Aqui você navega entre as categorias: diretórios, credenciais Karaf, Azure DevOps, serviços, portas, automação, logs e backup.'
  },
  {
    target: 'dirs-projects-path',
    title: 'Diretório de Repositórios',
    desc: 'Informe a pasta onde ficam seus repositórios Git; o painel escaneia essa pasta para listar seus projetos.'
  },
  {
    target: 'dirs-karaf-path',
    title: 'Diretório do Apache Karaf',
    desc: 'Aponte a raiz da instalação do Karaf para permitir iniciar/parar o servidor e rodar deploys.'
  },
  {
    target: 'auto-detect-button',
    title: 'Auto-Detectar Caminhos',
    desc: 'Escaneia seu computador automaticamente e tenta preencher os diretórios (Karaf, JDK, IDE) para você.'
  },
  {
    target: 'environment-profiles',
    title: 'Perfis de Ambiente',
    desc: 'Salve o conjunto atual de caminhos e portas como um preset nomeado para alternar rapidamente entre clientes/ambientes.'
  },
  {
    target: 'automation-defaults',
    title: 'Automação Padrão',
    desc: 'Defina o que já vem marcado (parar serviços, matar processos, abrir IDE, abrir navegador) ao preparar o ambiente.'
  },
  {
    target: 'save-settings-button',
    title: 'Salvar Configurações',
    desc: 'Grava todas as alterações feitas nesta página; sem clicar aqui, nada é persistido.'
  }
];
