import React from 'react';
import { Terminal, Boxes, FileSearch, ScrollText } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

interface EnvironmentModuleCardProps extends ModuleCardProps {
  debugPort: number;
}

export const EnvironmentModuleCard: React.FC<EnvironmentModuleCardProps> = ({ debugPort, onNavigate }) => (
  <ModuleCardShell
    icon={<Terminal className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
    title="1. Gestor de Ambiente &amp; Automação"
    subtitle="Servidor OSGi Debug, Portas &amp; Serviços"
    shortcut="Alt+1"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="env"
        colorClass="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
        label="Abrir Módulo de Ambiente"
      />
    }
  >
    <ModuleBullets
      intro="Automatiza o ciclo de preparação do computador para testes e depuração de ponta a ponta:"
      checkClass="text-emerald-400"
    >
      <span><strong>Parada dos Serviços:</strong> Interrompe serviços em segundo plano do Windows para liberar portas de rede.</span>
      <span><strong>Encerramento de Travas:</strong> Finaliza processos presos que travam arquivos JAR ou portas TCP.</span>
      <span><strong>Inicialização da IDE:</strong> Abre automaticamente o IntelliJ IDEA, VS Code ou Cursor conforme configurado.</span>
      <span><strong>Servidor Debug:</strong> Inicia o Karaf em modo JDWP (<code className="font-mono text-primary">:{debugPort}</code>) com Console Integrado interativo ou Janela Externa.</span>
    </ModuleBullets>
  </ModuleCardShell>
);

export const ContainersModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<Boxes className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-blue-400/10 text-blue-400 border border-blue-400/20"
    title="3. Containers Docker"
    subtitle="Gerenciador do Daemon Docker Local"
    shortcut="Alt+3"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="containers"
        colorClass="bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 border border-blue-400/30"
        label="Abrir Módulo de Containers"
      />
    }
  >
    <ModuleBullets
      intro="Controle intuitivo dos containers de apoio do seu ecossistema (bancos de dados, filas, caches):"
      checkClass="text-blue-400"
    >
      <span><strong>Status em Tempo Real:</strong> Identifica containers ativos, portas expostas e consumo.</span>
      <span><strong>Grupos de Containers:</strong> Organize containers em grupos personalizados (ex: Bancos, APIs, Mensageria), configure ordem e tempos de warm-up/delay e suba ou pare todos de uma vez com 1 clique.</span>
      <span><strong>Ações em Lote e Seleção Múltipla:</strong> Marque múltiplos containers via checkboxes para subir, parar ou reiniciar em lote, ou salvar a seleção em um novo grupo permanente.</span>
      <span><strong>Streaming de Logs:</strong> Visualização contínua das saídas stdout/stderr de cada container.</span>
    </ModuleBullets>
  </ModuleCardShell>
);

export const DocsRagModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<FileSearch className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20"
    title="7. Documentação Semântica (RAG Local)"
    subtitle="IA Local com Embeddings FastEmbed"
    shortcut="Alt+7"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="docs"
        colorClass="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30"
        label="Abrir Documentação Semântica"
      />
    }
  >
    <ModuleBullets
      intro="Indexação de manuais, diagnósticos técnicos e contratos de API com pesquisa por significado conceitual:"
      checkClass="text-purple-400"
    >
      <span><strong>Perguntas em Linguagem Natural:</strong> Encontre respostas mesmo sem saber o nome exato da função.</span>
      <span><strong>100% Offline e Seguro:</strong> Processamento de embeddings local, sem envio de código para nuvem.</span>
    </ModuleBullets>
  </ModuleCardShell>
);

export const LogsModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<ScrollText className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20"
    title="10. Logs em Tempo Real &amp; Log Analyzer"
    subtitle="Tail -f · Diagnóstico ORA / NPE / OSGi"
    shortcut="Alt+8"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="logs"
        colorClass="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30"
        label="Abrir Módulo de Logs"
      />
    }
  >
    <ModuleBullets
      intro="Monitoramento contínuo em tempo real (tail -f) de arquivos de log do Karaf e serviços locais:"
      checkClass="text-amber-500"
    >
      <span><strong>Log Analyzer WinThor:</strong> Classificação instantânea de falhas críticas (ORA-XXXXX, NullPointerException, BundleException, OutOfMemoryError).</span>
      <span><strong>Gaveta de Diagnóstico:</strong> Sugestão contextual de queries e ações corretivas em 1 clique.</span>
      <span><strong>Filtros por Nível:</strong> Destaque colorido para INFO, WARN e ERROR.</span>
    </ModuleBullets>
  </ModuleCardShell>
);
