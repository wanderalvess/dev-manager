import React from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { MCP_TOOL_COUNT, MCP_READ_TOOL_COUNT, MCP_DESTRUCTIVE_TOOL_COUNT } from '../../../../../shared/mcpCatalog';

export const MCP_ADD_READONLY_COMMAND =
  'claude mcp add dev-manager --scope user -e HUB_MCP_MODE=readonly -- cmd /c C:\\DevManager\\mcp\\dev-manager-mcp.cmd';

interface McpSafetyNoteProps {
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
  copyKey: string;
}

/** O que a IA pode fazer pelo MCP: modo completo, somente leitura e proteção de produção. */
export const McpSafetyNote: React.FC<McpSafetyNoteProps> = ({ copyToClipboard, copiedItem, copyKey }) => (
  <div className="p-2.5 rounded-xl bg-card/80 border border-border space-y-1.5">
    <span className="font-bold text-2xs uppercase tracking-wider text-primary flex items-center gap-1.5">
      <ShieldCheck className="w-3.5 h-3.5" />
      O que a IA pode fazer
    </span>
    <ul className="list-disc pl-4 space-y-1">
      <li>
        <strong className="text-foreground">Modo completo (padrão):</strong> as {MCP_TOOL_COUNT} tools ficam disponíveis. As{' '}
        {MCP_DESTRUCTIVE_TOOL_COUNT} destrutivas (apagar dados, rodar comando livre, mudar configuração) vêm marcadas para o
        assistente pedir sua aprovação antes de chamar.
      </li>
      <li>
        <strong className="text-foreground">Somente leitura:</strong> com a variável{' '}
        <code className="font-mono text-primary">HUB_MCP_MODE=readonly</code>, só as {MCP_READ_TOOL_COUNT} tools de consulta são
        registradas. As que alteram algo nem aparecem para a IA.
      </li>
      <li>
        <strong className="text-foreground">Produção protegida:</strong> em qualquer modo, a IA não executa SQL de escrita numa
        conexão marcada como produção.
      </li>
    </ul>
    <p>Para registrar no Claude Code já em somente leitura:</p>
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted font-mono text-2xs text-primary border border-border/60">
      <code className="break-all">{MCP_ADD_READONLY_COMMAND}</code>
      <button
        type="button"
        onClick={() => copyToClipboard(MCP_ADD_READONLY_COMMAND, copyKey)}
        className="p-1 hover:text-foreground transition-colors cursor-pointer shrink-0"
        title="Copiar comando"
        aria-label="Copiar comando"
      >
        {copiedItem === copyKey ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  </div>
);
