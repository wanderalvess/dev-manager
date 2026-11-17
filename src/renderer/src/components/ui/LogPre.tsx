import React, { useEffect, useRef } from 'react';

interface LogPreProps {
  text: string;
  /** Quebra linhas longas em vez de rolar na horizontal. */
  wrap?: boolean;
  /** Mantém a rolagem no fim quando `text` muda. */
  autoScroll?: boolean;
  className?: string;
}

/** Bloco monoespaçado para exibir saída de log, com rolagem automática opcional. */
export const LogPre: React.FC<LogPreProps> = ({ text, wrap = false, autoScroll = false, className = '' }) => {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (autoScroll && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, autoScroll]);

  return (
    <pre
      ref={ref}
      className={`text-2xs font-mono select-text ${wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'} ${className}`}
    >
      {text}
    </pre>
  );
};
