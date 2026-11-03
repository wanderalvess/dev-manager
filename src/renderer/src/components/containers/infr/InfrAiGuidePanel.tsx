import React, { useState } from 'react';
import { Bot, RotateCw, Square } from 'lucide-react';
import type { InfrAiGuideState } from '../../../hooks/containers/useInfrAiGuide';
import { InfrCommandLine } from './InfrCommandLine';

const EXAMPLE = 'Criar a versão 40 a partir do ambiente de origem, com o nome v40';

/** "Deixar a IA conduzir": o pedido em texto, o que a IA fez passo a passo e a confirmação do Gerar. */
export const InfrAiGuidePanel: React.FC<{ ai: InfrAiGuideState; name: string }> = ({ ai, name }) => {
  const [goal, setGoal] = useState('');
  const thinking = ai.status === 'thinking';
  return (
    <details className="rounded-xl border border-border/80 bg-muted/15 px-4 py-3" open={ai.log.length > 0 || undefined}>
      <summary className="text-sm font-bold text-foreground cursor-pointer inline-flex items-center gap-2">
        <Bot className="w-4 h-4 text-warning" /> Deixar a IA conduzir
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Usa a chave cadastrada em Configurações → IA &amp; LLM. A IA preenche o formulário, lê a origem e confere. Quem confirma o Gerar é você, e o
          que está bloqueado em vermelho ela não contorna. Credenciais são mascaradas antes de ir ao modelo.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ai.start(goal)}
            placeholder={EXAMPLE}
            aria-label="O que você quer que a IA faça"
            className="flex-1 min-w-[16rem] h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground"
          />
          {thinking ? (
            <button type="button" onClick={ai.stop} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted cursor-pointer">
              <Square className="w-3.5 h-3.5" /> Parar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => ai.start(goal)}
              disabled={!goal.trim()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-warning text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Conduzir
            </button>
          )}
        </div>

        {ai.log.length > 0 && (
          <ol aria-label="O que a IA fez" className="space-y-2">
            {ai.log.map((e, i) => (
              <li
                key={i}
                className={`text-xs rounded-lg border px-3 py-2 leading-relaxed ${
                  e.kind === 'error' ? 'border-danger/50 bg-danger/5 text-danger' : e.kind === 'ai' ? 'border-warning/40 bg-warning/5 text-foreground' : 'border-border/70 text-foreground/80'
                }`}
              >
                <span className="font-semibold">{e.kind === 'ai' ? 'IA: ' : e.kind === 'error' ? 'Erro: ' : 'Hub: '}</span>
                {e.text}
                {e.commands?.map((c) => (
                  <div key={c} className="mt-2">
                    <InfrCommandLine command={c} />
                  </div>
                ))}
              </li>
            ))}
          </ol>
        )}
        {thinking && (
          <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
            <RotateCw className="w-3.5 h-3.5 animate-spin" /> A IA está decidindo o próximo passo...
          </p>
        )}

        {ai.status === 'confirm' && (
          <div role="alert" className="rounded-lg border border-warning/60 bg-warning/10 px-3 py-3 space-y-2">
            <p className="text-sm font-semibold text-foreground">A IA quer gerar o ambiente {name || ''}. Confirma?</p>
            <p className="text-xs text-foreground/80">Grava o manifesto e a configuração e abre o terminal com o build, que leva uns 30 minutos.</p>
            <div className="flex gap-2">
              <button type="button" onClick={ai.confirmGenerate} className="h-9 px-4 rounded-lg bg-warning text-white text-sm font-semibold cursor-pointer">
                Confirmar e gerar
              </button>
              <button type="button" onClick={ai.declineGenerate} className="h-9 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted cursor-pointer">
                Não gerar
              </button>
            </div>
          </div>
        )}

        {ai.status === 'building' && (
          <button type="button" onClick={ai.checkEnvironment} className="h-9 px-4 rounded-lg border border-warning/60 text-warning bg-card text-sm font-semibold hover:bg-warning/10 cursor-pointer">
            Conferir o ambiente
          </button>
        )}
      </div>
    </details>
  );
};
