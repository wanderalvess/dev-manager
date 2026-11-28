import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Loader2, Send, Trash2 } from 'lucide-react';
import type { KbStatus } from '../../../../main/services/kb/KnowledgeBaseService';
import type { KbSource } from '../../../../shared/knowledgeBaseTypes';
import { useKbChat } from '../../hooks/docs/useKbChat';
import { KbChatMessageView } from './KbChatMessageView';

interface KbChatPanelProps {
  onNavigateToSettings?: () => void;
}

const EXAMPLES = [
  'Que validações o endpoint PUT /embalagem/salvar faz?',
  'Qual página do TDN descreve a rota de preço fixo?',
  'O que o código faz e o TDN não diz sobre limite de crédito?'
];

/** Chat com a Base de Conhecimento compartilhada (código das APIs Java + TDN), respondendo com o LLM ativo do Hub. */
export const KbChatPanel: React.FC<KbChatPanelProps> = ({ onNavigateToSettings }) => {
  const chat = useKbChat();
  const [status, setStatus] = useState<KbStatus | null>(null);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.electronAPI.kbStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [chat.messages.length, chat.isAsking]);

  const submit = () => {
    const question = text;
    setText('');
    void chat.send(question);
  };

  if (status && !(status.enabled && status.configured)) {
    return (
      <div className="cockpit-panel rounded-xl p-6 border border-border bg-card text-center space-y-3">
        <BookOpen className="w-6 h-6 text-primary mx-auto" />
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          A Base de Conhecimento compartilhada ainda não está conectada. Informe a URL do servidor e a chave de API, marque
          &quot;Usar a Base de Conhecimento&quot; e salve.
        </p>
        {onNavigateToSettings && (
          <button type="button" onClick={onNavigateToSettings} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
            Abrir Configurações → IA &amp; LLM
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1" aria-live="polite">
        {chat.messages.length === 0 && (
          <div className="cockpit-panel rounded-xl p-5 border border-border bg-card space-y-3">
            <p className="text-xs text-muted-foreground">
              Pergunte sobre as APIs Java e o TDN. A resposta cita as fontes <span className="font-mono text-primary">[n]</span> e
              avisa quando código e TDN dizem coisas diferentes. Dica: com o nome da rota na pergunta a busca acerta mais.
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => void chat.send(example)}
                  className="text-2xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 text-foreground hover:border-primary/50 cursor-pointer"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.messages.map((m) => (
          <KbChatMessageView key={m.id} message={m} />
        ))}
        {chat.isAsking && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Consultando a base e escrevendo a resposta...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2">
        <select
          aria-label="Filtrar por origem"
          value={chat.source}
          onChange={(e) => chat.setSource(e.target.value as KbSource | '')}
          className="rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground"
        >
          <option value="">Código e TDN</option>
          <option value="code">Só código</option>
          <option value="tdn">Só TDN</option>
        </select>
        <textarea
          value={text}
          rows={2}
          placeholder="Pergunte sobre uma API, uma rota ou uma divergência..."
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="flex-1 resize-none rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={chat.isAsking || !text.trim()}
          className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold disabled:opacity-50 cursor-pointer"
          aria-label="Enviar pergunta"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
        {chat.messages.length > 0 && (
          <button
            type="button"
            onClick={chat.clear}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground cursor-pointer"
            aria-label="Limpar a conversa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
