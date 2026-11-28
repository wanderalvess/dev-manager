import { useCallback, useState } from 'react';
import type { KbChatResponse, KbSource } from '../../../../shared/knowledgeBaseTypes';
import { friendlyKbError } from '../../utils/knowledgeBaseView';

export interface KbChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Só nas respostas do assistente. */
  reply?: Pick<KbChatResponse, 'answerable' | 'mixedSources' | 'citations' | 'mode' | 'model' | 'usageWarning'>;
  isError?: boolean;
}

/** Conversa com a Base de Conhecimento: guarda o histórico e manda as últimas mensagens a cada pergunta. */
export function useKbChat() {
  const [messages, setMessages] = useState<KbChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [source, setSource] = useState<KbSource | ''>('');

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || isAsking) return;
      const history = messages
        .filter((m) => !m.isError && (m.role === 'user' || m.reply?.answerable))
        .map((m) => ({ role: m.role, content: m.content }));
      const nextId = messages.length + 1;
      setMessages((prev) => [...prev, { id: nextId, role: 'user', content: text }]);
      setIsAsking(true);
      try {
        const res = await window.electronAPI.kbChat({ question: text, history, source: source || undefined });
        const reply = {
          answerable: res.answerable,
          mixedSources: res.mixedSources,
          citations: res.citations,
          mode: res.mode,
          model: res.model,
          usageWarning: res.usageWarning
        };
        setMessages((prev) => [...prev, { id: nextId + 1, role: 'assistant', content: res.answer, reply }]);
      } catch (err) {
        const message = friendlyKbError(err instanceof Error ? err.message : String(err));
        setMessages((prev) => [...prev, { id: nextId + 1, role: 'assistant', content: message, isError: true }]);
      } finally {
        setIsAsking(false);
      }
    },
    [messages, isAsking, source]
  );

  const clear = useCallback(() => setMessages([]), []);

  return { messages, isAsking, source, setSource, send, clear };
}
