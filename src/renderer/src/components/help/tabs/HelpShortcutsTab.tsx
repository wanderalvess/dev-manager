import React from 'react';
import {
  Zap,
  Code2,
  Terminal,
  Bot,
  Check,
  Copy
} from 'lucide-react';

interface ShortcutItem {
  key: string;
  desc: string;
  category: string;
}

interface HelpShortcutsTabProps {
  keyboardShortcuts: ShortcutItem[];
  debugPort: number;
  sshPort: number;
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
}

export const HelpShortcutsTab: React.FC<HelpShortcutsTabProps> = ({
  keyboardShortcuts,
  debugPort,
  sshPort,
  copyToClipboard,
  copiedItem
}) => {
  return (
    <div className="space-y-4">
      {/* Tabela de Atalhos de Teclado Globais */}
      <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
              Atalhos de Teclado Globais
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Navegação instantânea sem tirar as mãos do teclado
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {keyboardShortcuts.map((sc, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-card/60 border border-border flex items-center justify-between hover:border-primary/40 transition-colors shadow-2xs"
            >
              <div className="space-y-0.5 min-w-0 pr-3">
                <span className="text-xs font-bold text-foreground block truncate">{sc.desc}</span>
                <span className="text-2xs text-muted-foreground font-mono uppercase tracking-wider">
                  {sc.category}
                </span>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-muted border border-border font-mono text-xs font-bold text-primary shrink-0 shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Dicas Pro para Desenvolvedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dica 1: Debug IntelliJ */}
        <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-md space-y-3">
          <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Code2 className="w-4 h-4" />
            <span>Dica Pro: Depuração JVM Remota no IntelliJ IDEA</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Para depurar código Java dos serviços sem reiniciar o Karaf, crie uma configuração <strong className="text-foreground">Remote JVM Debug</strong> no IntelliJ apontando para <code className="font-mono text-primary font-semibold">localhost:{debugPort}</code>. Coloque breakpoints nos seus bundles e a IDE pausará a execução em tempo real!
          </p>
          <div className="p-2.5 rounded-xl bg-muted/60 border border-border font-mono text-[11px] text-foreground flex items-center justify-between">
            <span>Host: localhost • Port: {debugPort}</span>
            <span className="text-2xs text-muted-foreground font-sans">JDWP Socket</span>
          </div>
        </div>

        {/* Dica 2: Karaf Shell */}
        <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-md space-y-3">
          <div className="flex items-center space-x-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            <span>Dica Pro: Comandos Rápidos do Apache Karaf</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No terminal integrado ou via SSH (<code className="font-mono text-primary">localhost:{sshPort}</code>), use <code className="font-mono text-primary font-semibold">bundle:list -s</code> para inspecionar o status dos JARs OSGi, <code className="font-mono text-primary font-semibold">log:tail</code> para acompanhar logs e <code className="font-mono text-primary font-semibold">bundle:restart &lt;ID&gt;</code> para recarregar um bundle em 2 segundos.
          </p>
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border font-mono text-[11px]">
            <code className="text-primary font-bold">bundle:list -s</code>
            <button
              onClick={() => copyToClipboard('bundle:list -s', 'cmd-karaf-bl')}
              className="p-1 hover:text-foreground text-muted-foreground transition cursor-pointer"
              title="Copiar comando"
            >
              {copiedItem === 'cmd-karaf-bl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dica 3: Automação por IA via MCP */}
        <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-md space-y-3">
          <div className="flex items-center space-x-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
            <Bot className="w-4 h-4" />
            <span>Dica Pro: Automação por IA no IntelliJ &amp; VS Code (Copilot / MCP)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Conecte o servidor MCP do Hub Manager ao seu GitHub Copilot no IntelliJ IDEA ou VS Code. Basta pedir em linguagem natural: <strong className="text-foreground">"Faça o clean install do projeto atual e instale a feature no Karaf"</strong>. A IA compila via Maven, aciona os comandos Karaf e verifica se o bundle ficou ativo automaticamente!
          </p>
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border font-mono text-[11px]">
            <code className="text-primary truncate" title="Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa.">Faça o clean install... e instale a feature</code>
            <button
              onClick={() => copyToClipboard('Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa.', 'tip-mcp-prompt')}
              className="p-1 hover:text-foreground text-muted-foreground transition cursor-pointer shrink-0 ml-2"
              title="Copiar prompt completo"
            >
              {copiedItem === 'tip-mcp-prompt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
