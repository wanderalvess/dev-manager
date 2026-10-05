import React from 'react';
import { Activity } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const ApmModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<Activity className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20"
    title="8. APM &amp; Traces (OpenTelemetry)"
    subtitle="Receptor OTLP/HTTP embutido · porta 4318"
    shortcut="Alt+0"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="apm"
        colorClass="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30"
        label="Abrir APM &amp; Traces"
      />
    }
  >
    <ModuleBullets
      intro="Observabilidade local das suas APIs sem subir um OTel Collector ou SigNoz:"
      checkClass="text-rose-500"
    >
      <span><strong>Dashboard &amp; Detecção de Gargalos:</strong> Vazão (RPS), percentis (p50/p95/p99), taxa de erros, ranking dos endpoints mais lentos e consultas SQL demoradas com filtros instantâneos em 1 clique.</span>
      <span><strong>Waterfall com Régua Visual:</strong> Linha do tempo com régua graduada dividindo proporcionalmente o tempo total entre <em>Requisição HTTP</em>, <em>Processamento Java</em> e <em>Queries JDBC no banco</em>, tags de queries lentas e filtros por camada.</span>
      <span><strong>Karaf Instrumentado:</strong> Com o <code className="font-mono text-primary">opentelemetry-javaagent.jar</code> em <code className="font-mono text-primary">&lt;karaf&gt;/bin</code> e o toggle "Anexar automaticamente" ligado em <em>Como Conectar</em>, o agente é anexado sozinho ao iniciar pelo Cockpit (desligado por padrão, para não poluir o log do Karaf).</span>
      <span><strong>Porta Configurável:</strong> Troque a porta em <em>Como Conectar</em> se outro coletor já ocupa a 4318.</span>
      <span><strong>Nome do Serviço Configurável:</strong> Defina o <code className="font-mono text-primary">otel.service.name</code> em <em>Como Conectar</em> — identifica sua aplicação no APM em vez do padrão genérico <code className="font-mono text-primary">karaf-app</code>.</span>
    </ModuleBullets>
  </ModuleCardShell>
);
