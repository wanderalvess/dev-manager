import React from 'react';
import { Layers } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const DeployModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<Layers className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-warning/10 text-warning border border-warning/20"
    title="4. Perfis de Deploy (Multi-Alvo)"
    subtitle="Karaf OSGi · Docker · Comandos Maven"
    shortcut="Alt+4"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="deploy"
        colorClass="bg-warning/10 hover:bg-warning/20 text-warning border border-warning/30"
        label="Abrir Módulo de Deploy"
      />
    }
  >
    <ModuleBullets
      intro="Crie pipelines sequenciais de build e publicação com feedback visual instantâneo:"
      checkClass="text-warning"
    >
      <span><strong>Karaf OSGi:</strong> Comandos <code className="font-mono text-primary">feature:repo-add</code> e <code className="font-mono text-primary">feature:install</code> sugeridos pelo <code className="font-mono text-primary">pom.xml</code>.</span>
      <span><strong>Proteção Prévia OSGi:</strong> Validação automática do status do Karaf (porta SSH 8101) antes de compilar ou instalar, prevenindo falsos sucessos e esperas desnecessárias com container offline.</span>
      <span><strong>Docker Pipelines:</strong> Build de imagem, push para registry e restart do serviço em etapas separadas.</span>
      <span><strong>Diagnóstico Inteligente de Dependências OSGi:</strong> Detecção e parsing automático de falhas <code className="font-mono text-primary">ResolutionException</code> / <code className="font-mono text-primary">missing requirement</code>, correlacionando o pacote ausente com o <code className="font-mono text-primary">pom.xml</code> e sugerindo card de ação com 1 clique para rodar o perfil da dependência ou instalar a release necessária.</span>
      <span><strong>Diagnóstico Karaf:</strong> Listar bundles instalados (<code className="font-mono text-primary">bundle:list</code>) e logs (<code className="font-mono text-primary">log:display</code>).</span>
      <span><strong>Gerenciador de Bundles:</strong> A lista se atualiza sozinha a cada 10 s. Em cada linha, <em>Ver o log deste bundle</em> fecha o gerenciador e abre o console do rodapé com <code className="font-mono text-primary">log:tail</code> filtrado pelo nome, e <em>Monitorar</em> aplica <code className="font-mono text-primary">bundle:watch</code> ao bundle. Ao desinstalar um bundle que não pertence a nenhuma feature, o modal já abre no modo <em>bundle</em>; instalar com sucesso fecha o modal.</span>
      <span><strong>Monitor de Memória Heap da JVM (JMX):</strong> Telemetria contínua com gráfico de consumo de Heap e Non-Heap (Metaspace), alertas automáticos de risco de OutOfMemoryError (OOM) e botão de 1 clique para executar Garbage Collection (GC) na JVM.</span>
      <span><strong>Gerenciador de Features Maven &amp; Repositórios:</strong> Interface interativa para listar repositórios (<code className="font-mono text-primary">feature:repo-list</code>), atualizar (<code className="font-mono text-primary">feature:repo-refresh</code>), cadastrar URLs Maven e instalar/desinstalar features OSGi do WinThor com 1 clique.</span>
      <span><strong>Montar fila:</strong> No painel de etapas, <em>Montar fila</em> lê os projetos Maven da <em>Pasta de projetos</em> (Configurações), deixa você marcar quais compilar e gera as etapas de build já ordenadas por dependência (<code className="font-mono text-primary">pom.xml</code>: dependências e parent). Os projetos de que os marcados dependem entram sozinhos (opcional), há opção de pular testes e de instalar no Karaf os projetos com packaging <code className="font-mono text-primary">bundle</code>, e o resultado pode ser acrescentado ou substituir as etapas do perfil. Dependência circular é avisada.</span>
      <span><strong>Execução Seletiva &amp; Pular Etapas:</strong> Marque ou desmarque checkboxes nas etapas para incluir ou pular fluxos na execução automática (ex.: pular o <code className="font-mono text-primary">mvn clean</code> demorado e rodar o restante), use a ação rápida <strong className="text-foreground">"Daqui em diante"</strong> para executar a partir de qualquer ponto até o final, ou execute etapas isoladas manualmente.</span>
      <span><strong>Catálogo Oficial da Rotina 801:</strong> Instalação e atualização de serviços web e rotinas com filtro por famílias de versão (ex.: 1.39.x, 1.38.x, 0.39.x), seleção em lote de releases completas, assistente de Instalação Direta com override de versão para montagem de ambientes específicos e pré-registro automático de repositórios Maven (<code className="font-mono text-primary">feature:repo-add</code>) eliminando o erro "No matching features".</span>
    </ModuleBullets>
  </ModuleCardShell>
);
