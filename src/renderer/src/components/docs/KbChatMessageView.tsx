import React from 'react';
import { AlertTriangle, ExternalLink, GitCompare } from 'lucide-react';
import { AiMarkdownViewer } from '../AiMarkdownViewer';
import type { KbChatMessage } from '../../hooks/docs/useKbChat';

const SOURCE_LABEL: Record<string, string> = { code: 'código', tdn: 'TDN' };

interface KbChatMessageViewProps {
  message: KbChatMessage;
}

/** Uma mensagem do chat: balão do usuário, ou resposta com aviso de divergência e as fontes [n]. */
export const KbChatMessageView: React.FC<KbChatMessageViewProps> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-xl bg-primary/10 border border-primary/30 px-3.5 py-2 text-xs text-foreground whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  const { reply } = message;
  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border px-4 py-3 ${
          message.isError ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'
        }`}
      >
        {message.isError && (
          <div className="flex items-center gap-1.5 text-2xs font-bold text-destructive mb-1">
            <AlertTriangle className="w-3 h-3" /> Não foi possível responder
          </div>
        )}
        <AiMarkdownViewer content={message.content} />
        {reply?.mixedSources && reply.answerable && (
          <div className="mt-2 flex items-center gap-1.5 text-2xs text-warning">
            <GitCompare className="w-3 h-3" /> Esta resposta combina código e TDN: confira se eles dizem o mesmo.
          </div>
        )}
        {reply?.usageWarning && <div className="mt-2 text-2xs text-warning">{reply.usageWarning}</div>}
      </div>

      {reply && reply.citations.length > 0 && (
        <ul className="space-y-1 pl-1" aria-label="Fontes">
          {reply.citations.map((c) => (
            <li key={c.chunkId} className="flex items-start gap-2 text-2xs text-muted-foreground">
              <span className="font-mono font-bold text-primary shrink-0">[{c.n}]</span>
              <span className="min-w-0">
                <span className="text-foreground font-semibold">{c.title}</span>
                {c.headingPath && c.headingPath !== c.title && <span> › {c.headingPath}</span>}
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted font-mono">
                  {[SOURCE_LABEL[c.source ?? ''] ?? c.docType, c.module].filter(Boolean).join(' · ')}
                </span>
                {c.sourceUrl && /^https?:\/\//.test(c.sourceUrl) && (
                  <button
                    type="button"
                    onClick={() => window.electronAPI.openExternal(c.sourceUrl as string)}
                    className="ml-1.5 inline-flex items-center gap-0.5 text-primary hover:underline cursor-pointer"
                  >
                    abrir <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
