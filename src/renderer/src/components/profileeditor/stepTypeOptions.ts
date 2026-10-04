import { Terminal, Server, Activity, Code2, Globe, Flame, Database } from 'lucide-react';
import type { ComponentType } from 'react';
import type { AutomationStepType } from '../../../../shared/types';

export interface StepTypeOption {
  type: AutomationStepType;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
}

export const STEP_TYPE_OPTIONS: StepTypeOption[] = [
  {
    type: 'command',
    label: 'Comando / Script (.bat, npm, mvnw, gradlew, docker)',
    desc: 'Executa um comando ou script em uma pasta específica',
    icon: Terminal
  },
  {
    type: 'kill-port',
    label: 'Liberar Porta (Kill Process)',
    desc: 'Encerra qualquer processo ocupando uma porta de rede',
    icon: Activity
  },
  {
    type: 'service-start',
    label: 'Iniciar Serviço Windows',
    desc: 'Inicia um serviço do Windows pelo nome',
    icon: Server
  },
  {
    type: 'service-stop',
    label: 'Parar Serviço Windows',
    desc: 'Para um serviço do Windows antes de rodar os projetos',
    icon: Server
  },
  {
    type: 'kill-process',
    label: 'Finalizar Processo por Nome',
    desc: 'Finaliza um processo .exe conflitante',
    icon: Flame
  },
  {
    type: 'ide',
    label: 'Inicializar IDE / Editor',
    desc: 'Abre a IDE configurada (IntelliJ, VSCode, Cursor)',
    icon: Code2
  },
  {
    type: 'karaf',
    label: 'Iniciar Karaf OSGi Debug',
    desc: 'Dispara o Karaf em modo debug',
    icon: Server
  },
  {
    type: 'browser',
    label: 'Abrir Navegador Web',
    desc: 'Abre uma URL específica no navegador padrão',
    icon: Globe
  },
  {
    type: 'db-query',
    label: 'Executar SQL em Banco de Dados',
    desc: 'Roda um UPDATE/INSERT/SELECT em uma conexão salva',
    icon: Database
  }
];
