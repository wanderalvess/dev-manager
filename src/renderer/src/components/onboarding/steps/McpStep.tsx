import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { MCP_EXAMPLES } from '../onboardingContent';
import { Eyebrow, StepLead, StepTitle } from './stepUi';
import { PANEL, selectableRow } from './stepStyles';

interface McpStepProps {
  exampleIndex: number;
  onExampleChange: (i: number) => void;
}

/** Etapa 5: um pedido em linguagem natural, as tools MCP que o agente chama e o resultado. */
export const McpStep: React.FC<McpStepProps> = ({ exampleIndex, onExampleChange }) => {
  const mcp = MCP_EXAMPLES[exampleIndex];
  return (
    <>
      <Eyebrow n={5}>IA &amp; MCP</Eyebrow>
      <StepTitle>Seus agentes de IA também pilotam o cockpit.</StepTitle>
      <StepLead>
        O servidor MCP embutido expõe o Hub Manager ao Claude Code e a outros assistentes. Você pede em linguagem natural e o agente
        executa. Escolha um pedido:
      </StepLead>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-96 shrink-0 flex flex-col gap-1.5">
          {MCP_EXAMPLES.map((m, i) => (
            <button key={m.ask} type="button" aria-pressed={i === exampleIndex} onClick={() => onExampleChange(i)} className={`${selectableRow(i === exampleIndex)} text-sm font-semibold`}>
              {m.ask}
            </button>
          ))}
        </div>

        <section aria-label="Conversa de exemplo" aria-live="polite" className={`flex-1 min-w-0 flex flex-col ${PANEL}`}>
          <div className="min-h-12 px-5 flex items-center gap-2.5 border-b border-border font-mono text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-success" /> agente conectado ao Hub Manager via MCP
          </div>
          <div className="flex-1 p-6 flex flex-col gap-5">
            <div className="self-end max-w-[75%] px-4 py-3 rounded-2xl rounded-br-sm bg-muted font-semibold">{mcp.ask}</div>
            <div className="flex flex-col items-start gap-2">
              <span className="font-mono text-xs text-muted-foreground">o agente chama</span>
              {mcp.tools.map((t) => (
                <span key={t} className="min-h-9 px-3 rounded-lg border border-primary/40 bg-primary/10 font-mono text-sm flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-primary" /> {t}
                </span>
              ))}
            </div>
            <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm border border-border flex items-start gap-3">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-success" strokeWidth={3} />
              <span className="text-sm leading-relaxed">{mcp.result}</span>
            </div>
          </div>
          <div className="min-h-14 px-5 flex items-center border-t border-border text-sm text-muted-foreground">
            O estado do MCP e das outras integrações fica na tela Integrações, no fim do menu lateral.
          </div>
        </section>
      </div>
    </>
  );
};
