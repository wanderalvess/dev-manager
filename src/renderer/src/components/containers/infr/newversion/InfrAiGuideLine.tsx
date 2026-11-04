import React, { useState } from 'react';
import { Bot, CheckCircle2, ChevronDown, ClipboardPaste, Play, RotateCw, Send, Square, XCircle } from 'lucide-react';
import type { InfrAiGuideState } from '../../../../hooks/containers/useInfrAiGuide';
import { InfrCommandLine } from '../InfrCommandLine';

const BTN = 'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/** Responder à IA e, se quiser, colar a saída do terminal: a conversa continua de onde parou, sem apagar o contexto. */
const InfrAiReply: React.FC<{ ai: InfrAiGuideState }> = ({ ai }) => {
  const [text, setText] = useState('');
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const canSend = !!(text.trim() || paste.trim());
  const send = () => {
    if (!canSend) return;
    ai.reply(text, paste);
    setText('');
    setPaste('');
    setShowPaste(false);
  };
  return (
    <div className="px-3 pb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="nv-ia-reply" className="sr-only">
          Responder à IA
        </label>
        <input
          id="nv-ia-reply"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          placeholder="Responder à IA, ex.: já atualizei a pasta"
          className="flex-1 min-w-[14rem] h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground"
        />
        <button
          type="button"
          onClick={() => setShowPaste((o) => !o)}
          aria-expanded={showPaste}
          className={`${BTN} border-border bg-card text-foreground hover:bg-muted`}
        >
          <ClipboardPaste className="w-3 h-3" /> Colar erro do terminal
        </button>
        <button type="button" onClick={send} disabled={!canSend} className={`${BTN} border-warning bg-warning text-white`}>
          <Send className="w-3 h-3" /> Enviar
        </button>
      </div>
      {showPaste && (
        <div className="space-y-1">
          <textarea
            aria-label="Saída do terminal"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Cole aqui o que o terminal mostrou"
            className="w-full h-28 p-2 rounded-lg border border-input bg-background font-mono text-2xs text-foreground"
          />
          <p className="text-2xs text-muted-foreground">Senhas, tokens e usuário:senha@ em URL são escondidos antes de irem para a IA.</p>
        </div>
      )}
    </div>
  );
};

/**
 * A IA numa linha: em que pé está e a última coisa que ela disse. O que ela fez vai para "Ver o que a IA fez",
 * fechado; os campos que ela preencheu ganham a marca nos campos, e problemas ficam em Antes de criar.
 */
export const InfrAiGuideLine: React.FC<{ ai: InfrAiGuideState; blocked: boolean }> = ({ ai, blocked }) => {
  const [goal, setGoal] = useState('');
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState(false);
  const thinking = ai.status === 'thinking';
  const last = [...ai.log].reverse().find((e) => e.kind !== 'hub' && e.kind !== 'user') ?? ai.log[ai.log.length - 1];
  const started = ai.log.length > 0 || thinking;

  if (!started || asking) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-warning/50 bg-warning/5">
        <Bot className="w-4 h-4 text-warning shrink-0" />
        <label htmlFor="nv-ia" className="sr-only">
          Pedido para a IA
        </label>
        <input
          id="nv-ia"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && goal.trim()) {
              ai.start(goal);
              setAsking(false);
            }
          }}
          placeholder="Peça à IA, ex.: criar a 40 a partir do master com o nome homolog. Ou escolha abaixo."
          className="flex-1 min-w-[16rem] h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground"
        />
        <button
          type="button"
          onClick={() => {
            ai.start(goal);
            setAsking(false);
          }}
          disabled={!goal.trim()}
          className={`${BTN} border-warning bg-warning text-white`}
        >
          Conduzir
        </button>
      </div>
    );
  }

  const ready = ai.status === 'confirm';
  const failed = last?.kind === 'error';
  // A IA respondeu com uma orientação (say): não há o que "continuar", a pessoa responde ou pede outra coisa
  const answered = !thinking && ai.status === 'idle' && last?.kind === 'ai';
  const title = thinking
    ? 'A IA está preenchendo...'
    : ready
      ? 'A IA terminou: nada impede. Nada foi criado; o Criar é seu.'
      : ai.status === 'building'
        ? 'Build em andamento. Quando terminar, a IA confere se o ambiente subiu.'
        : ai.status === 'done'
          ? 'A IA terminou.'
          : failed
            ? 'A IA parou com erro.'
            : answered
              ? 'A IA respondeu.'
              : blocked
                ? 'A IA parou: resolva o que está em vermelho e ela continua.'
                : 'A IA parou.';
  const box = ready ? 'border-success/40 bg-success/5' : failed ? 'border-danger/40 bg-danger/5' : 'border-warning/50 bg-warning/5';
  const icon = thinking ? (
    <RotateCw className="w-4 h-4 text-warning animate-spin" />
  ) : ready ? (
    <CheckCircle2 className="w-4 h-4 text-success" />
  ) : failed ? (
    <XCircle className="w-4 h-4 text-danger" />
  ) : (
    <Bot className="w-4 h-4 text-warning" />
  );

  return (
    <div className={`rounded-xl border ${box}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <span className="shrink-0">{icon}</span>
        <div className="flex-1 min-w-[16rem]">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {last && !thinking && <p className={`text-xs mt-0.5 leading-relaxed break-words ${failed ? 'text-danger' : 'text-foreground/80'}`}>{last.text}</p>}
          {ai.goal && <p className="text-2xs text-muted-foreground mt-0.5">Pedido: &ldquo;{ai.goal}&rdquo;</p>}
        </div>
        {thinking ? (
          <button type="button" onClick={ai.stop} className={`${BTN} border-border bg-card text-foreground hover:bg-muted`}>
            <Square className="w-3 h-3" /> Parar
          </button>
        ) : ai.status === 'building' ? (
          <button type="button" onClick={ai.checkEnvironment} className={`${BTN} border-warning/60 bg-card text-warning hover:bg-warning/10`}>
            Conferir agora
          </button>
        ) : (
          <>
            {!ready && !answered && ai.status !== 'done' && (
              <button type="button" onClick={ai.resume} disabled={blocked} className={`${BTN} border-warning bg-warning text-white`}>
                <Play className="w-3 h-3 fill-current" /> Continuar
              </button>
            )}
            <button type="button" onClick={() => setAsking(true)} className={`${BTN} border-border bg-card text-foreground hover:bg-muted`}>
              Pedir outra coisa
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-2xs font-semibold text-warning hover:underline cursor-pointer"
        >
          O que a IA fez ({ai.log.length}) <ChevronDown className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {last?.commands && !thinking && (
        <div className="px-3 pb-3 space-y-2">
          {last.commands.map((c) => (
            <InfrCommandLine key={c} command={c} />
          ))}
        </div>
      )}
      {!thinking && !ready && <InfrAiReply ai={ai} />}
      {open && (
        <ol className="px-3 pb-3 pt-1 space-y-1 border-t border-border/60">
          {ai.log.map((e, i) => (
            <li key={i} className={`flex gap-2 text-2xs leading-relaxed ${e.kind === 'error' ? 'text-danger' : 'text-foreground/80'}`}>
              {e.kind === 'user' && <span className="font-semibold shrink-0">Você:</span>}
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${e.kind === 'error' ? 'bg-danger' : e.kind === 'ai' ? 'bg-warning' : 'bg-muted-foreground/50'}`} />
              <span className="break-words">{e.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
