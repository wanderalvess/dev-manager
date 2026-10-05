import React from 'react';
import { Terminal, Bot, BookOpen, Copy, Check } from 'lucide-react';
import { ModuleBullets, ModuleCardShell } from './ModuleCardShell';

interface McpModuleCardProps {
  handleOpenMcpDocs: () => void;
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
}

export const McpModuleCard: React.FC<McpModuleCardProps> = ({ handleOpenMcpDocs, copyToClipboard, copiedItem }) => (
  <ModuleCardShell
    icon={<Bot className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20"
    title="9. Servidor MCP (Automação por IA)"
    subtitle="165 Tools via stdio · IntelliJ · VS Code · Claude"
    footer={
      <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
          <code className="font-mono text-[11px] text-primary truncate">npm run mcp</code>
        </div>
        <button
          onClick={() => copyToClipboard('npm run mcp', 'cmd-mcp-module')}
          className="px-2.5 py-1 bg-card hover:bg-card/90 text-foreground border border-border rounded-lg text-2xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          {copiedItem === 'cmd-mcp-module' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span>Copiar Comando</span>
        </button>
      </div>
    }
  >
    <ModuleBullets
      intro="Ponte de controle nativa para agentes e assistentes de IA interagirem com seu ambiente de desenvolvimento:"
      checkClass="text-violet-400"
    >
      <span><strong>Automação de Build &amp; Deploy:</strong> Compilação Maven, deploy de features e verificação de ativação via linguagem natural no chat da IDE.</span>
      <span><strong>Banco de Dados &amp; Binds:</strong> Execução de queries no Oracle/Postgres, Statement Tracer com captura e interpolação de binds e busca semântica em manuais locais.</span>
      <span><strong>Git, Tarefas &amp; Rotinas:</strong> Criação de branch padronizada vinculada a tarefas Azure DevOps/Jira, rollback de rotinas .bak e download CCW.</span>
      <span><strong>QA &amp; TAUT Cypress:</strong> Disparo de testes por tags, cálculo de cobertura Zephyr e geração de intake CSV via tools MCP (taut_*).</span>
    </ModuleBullets>

    <div className="p-2.5 rounded-xl bg-card/80 border border-border space-y-1.5 shadow-inner">
      <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Exemplo de Prompt no IntelliJ / VS Code Copilot:</span>
      <p className="font-mono text-[11px] text-foreground bg-muted/80 p-2 rounded-lg border border-border/50">
        "Execute os testes críticos de Pedido do projeto TAUT e analise a cobertura de testes do Zephyr."
      </p>
    </div>

    <button
      onClick={handleOpenMcpDocs}
      className="w-full mt-2 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <BookOpen className="w-3.5 h-3.5" />
      <span>Ver Catálogo Completo das 165 Ferramentas MCP</span>
    </button>
  </ModuleCardShell>
);
