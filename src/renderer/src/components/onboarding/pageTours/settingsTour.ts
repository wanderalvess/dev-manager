import { TourStep } from '../tourSteps';

export const SETTINGS_TOUR_STORAGE_KEY = 'devManager:tour:settings';

export const SETTINGS_TOUR_STEPS: TourStep[] = [
  {
    target: 'tabs-nav-dirs',
    title: 'Abas de Configuração',
    desc: 'Aqui você navega entre as categorias, agrupadas por tema: Ambiente (diretórios, Karaf, rotinas WinThor, Azure), Monitoramento (serviços, portas, logs) e Recursos (automação, backup, IA, qualidade, uso).'
  },
  {
    target: 'dirs-projects-path',
    title: 'Diretório de Repositórios',
    desc: 'Informe a pasta onde ficam seus repositórios Git; o painel escaneia essa pasta para listar seus projetos.'
  },
  {
    target: 'auto-detect-button',
    title: 'Auto-Detectar Caminhos',
    desc: 'Escaneia seu computador automaticamente e tenta preencher os diretórios (Karaf, JDK, IDE) para você nas respectivas abas.'
  },
  {
    target: 'environment-profiles',
    title: 'Presets de Ambiente',
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
