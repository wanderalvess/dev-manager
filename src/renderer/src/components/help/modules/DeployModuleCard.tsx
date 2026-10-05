import React from 'react';
import { Layers } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const DeployModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<Layers className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20"
    title="4. Perfis de Deploy (Multi-Alvo)"
    subtitle="Karaf OSGi · Docker · Comandos Maven"
    shortcut="Alt+4"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="deploy"
        colorClass="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30"
        label="Abrir Módulo de Deploy"
      />
    }
  >
    <ModuleBullets
      intro="Crie pipelines sequenciais de build e publicação com feedback visual instantâneo:"
      checkClass="text-amber-400"
    >
      <span><strong>Karaf OSGi:</strong> Comandos <code className="font-mono text-primary">feature:repo-add</code> e <code className="font-mono text-primary">feature:install</code> sugeridos pelo <code className="font-mono text-primary">pom.xml</code>.</span>
      <span><strong>Proteção Prévia OSGi:</strong> Validação automática do status do Karaf (porta SSH 8101) antes de compilar ou instalar, prevenindo falsos sucessos e esperas desnecessárias com container offline.</span>
      <span><strong>Docker Pipelines:</strong> Build de imagem, push para registry e restart do serviço em etapas separadas.</span>
      <span><strong>Diagnóstico Inteligente de Dependências OSGi:</strong> Detecção e parsing automático de falhas <code className="font-mono text-primary">ResolutionException</code> / <code className="font-mono text-primary">missing requirement</code>, correlacionando o pacote ausente com o <code className="font-mono text-primary">pom.xml</code> e sugerindo card de ação com 1 clique para rodar o perfil da dependência ou instalar a release necessária.</span>
      <span><strong>Diagnóstico Karaf:</strong> Listar bundles instalados (<code className="font-mono text-primary">bundle:list</code>) e logs (<code className="font-mono text-primary">log:display</code>).</span>
      <span><strong>Monitor de Memória Heap da JVM (JMX):</strong> Telemetria contínua com gráfico de consumo de Heap e Non-Heap (Metaspace), alertas automáticos de risco de OutOfMemoryError (OOM) e botão de 1 clique para executar Garbage Collection (GC) na JVM.</span>
      <span><strong>Gerenciador de Features Maven &amp; Repositórios:</strong> Interface interativa para listar repositórios (<code className="font-mono text-primary">feature:repo-list</code>), atualizar (<code className="font-mono text-primary">feature:repo-refresh</code>), cadastrar URLs Maven e instalar/desinstalar features OSGi do WinThor com 1 clique.</span>
      <span><strong>Catálogo Oficial da Rotina 801:</strong> Instalação e atualização de serviços web e rotinas com filtro por famílias de versão (ex.: 1.39.x, 1.38.x, 0.39.x), seleção em lote de releases completas, assistente de Instalação Direta com override de versão para montagem de ambientes específicos e pré-registro automático de repositórios Maven (<code className="font-mono text-primary">feature:repo-add</code>) eliminando o erro "No matching features".</span>
    </ModuleBullets>
  </ModuleCardShell>
);
