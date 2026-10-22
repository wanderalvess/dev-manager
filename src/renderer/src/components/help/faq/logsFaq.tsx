import React from 'react';
import type { FaqItem } from '../helpData';

export function getLogsFaq(onNavigate?: (tab: string) => void): FaqItem[] {
  return [
    {
      id: 'logs-search-modes',
      question: 'Como funciona a busca nos logs? Qual a diferença entre Localizar e Filtrar?',
      category: 'Logs em Tempo Real',
      tags: ['logs', 'busca', 'localizar', 'filtrar', 'contexto', 'tail', 'pesquisa', 'linhas'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            A barra de busca dos Logs (<kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-2xs text-foreground font-bold">Ctrl+F</kbd>)
            oferece dois modos integrados para facilitar diagnósticos:
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-foreground">Modo Localizar (padrão):</strong> Mantém o arquivo de log completo na tela e
              destaca as ocorrências, rolando suavemente até a linha ativa. Permite ver exatamente o que aconteceu antes e depois do erro
              (stack traces e linhas vizinhas). Navegue entre ocorrências com <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono text-2xs">Enter</kbd> (próxima),{' '}
              <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono text-2xs">Shift+Enter</kbd> (anterior) ou <kbd className="px-1 py-0.2 rounded bg-muted border border-border font-mono text-2xs">F3</kbd>.
            </li>
            <li>
              <strong className="text-foreground">Modo Filtrar:</strong> Isola apenas as linhas correspondentes. Você pode definir linhas de
              contexto (<code className="font-mono text-primary font-bold">±1</code>, <code className="font-mono text-primary font-bold">±3</code>,{' '}
              <code className="font-mono text-primary font-bold">±5</code>) para enxergar o contexto imediato sem poluição visual. Cada linha filtrada
              oferece o botão <strong className="text-foreground">&quot;No contexto&quot;</strong> para saltar direto ao ponto exato no log completo.
            </li>
          </ul>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('logs')}
              className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Abrir Logs em Tempo Real
            </button>
          )}
        </div>
      )
    }
  ];
}
