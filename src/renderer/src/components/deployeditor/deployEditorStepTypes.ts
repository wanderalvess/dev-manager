import type { ComponentType } from 'react';
import {
  Hammer,
  Layers,
  ListTree,
  Package,
  UploadCloud,
  RotateCcw,
  Terminal,
  Clock,
  Globe,
  Server
} from 'lucide-react';
import type { DeployStep, DeployStepType } from '../../../../shared/types';

export interface StepTypeOption {
  type: DeployStepType;
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
}

export interface StepFieldsProps {
  step: DeployStep;
  onUpdate: (fields: Partial<DeployStep>) => void;
  onSelectDirectory: (field: 'projectPath' | 'cwd' | 'dockerContextPath') => void;
}

export const STEP_TYPE_OPTIONS: StepTypeOption[] = [
  {
    type: 'maven-build',
    label: 'Build Maven (mvn clean install)',
    desc: 'Compila o projeto antes de publicar',
    icon: Hammer
  },
  {
    type: 'karaf-command',
    label: 'Comando Karaf OSGi (client.bat)',
    desc: 'feature:repo-add, feature:install, bundle:*, ou qualquer comando de shell Karaf',
    icon: Layers
  },
  {
    type: 'karaf-bundle',
    label: 'Bundle OSGi: Ciclo de Vida',
    desc: 'Instalar, reinstalar, reiniciar ou desinstalar um bundle OSGi',
    icon: ListTree
  },
  {
    type: 'docker-build',
    label: 'Container: Build de Imagem',
    desc: 'Builda uma imagem a partir de um Dockerfile / Containerfile',
    icon: Package
  },
  {
    type: 'docker-push',
    label: 'Container: Push de Imagem',
    desc: 'Envia a imagem construída para o registry de containers',
    icon: UploadCloud
  },
  {
    type: 'docker-restart',
    label: 'Container: Reiniciar Container',
    desc: 'Reinicia um container já existente pelo nome ou ID',
    icon: RotateCcw
  },
  {
    type: 'command',
    label: 'Comando / Script Genérico',
    desc: 'Executa qualquer comando num diretório, com saída em tempo real',
    icon: Terminal
  },
  {
    type: 'wait',
    label: 'Aguardar / Delay (Sleep)',
    desc: 'Pausa a esteira por N segundos com contagem regressiva no log',
    icon: Clock
  },
  {
    type: 'http-healthcheck',
    label: 'Healthcheck HTTP (Sondagem)',
    desc: 'Verifica se uma URL responde com HTTP 200/esperado antes de prosseguir',
    icon: Globe
  },
  {
    type: 'service-action',
    label: 'Serviço Windows (Iniciar/Parar)',
    desc: 'Controla inicialização ou parada de serviços do Windows (ex: Oracle, Postgres)',
    icon: Server
  }
];
