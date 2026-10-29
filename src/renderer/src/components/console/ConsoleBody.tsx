import React from 'react';
import { useStickToBottom } from '../../hooks/useStickToBottom';

interface ConsoleBodyProps {
  /** Saída como texto único (preserva quebras). */
  text?: string;
  /** Saída como lista de linhas; use com `getLineClass` para colorir. */
  lines?: string[];
  getLineClass?: (line: string) => string;
  /** Exibido quando não há saída. */
  empty?: React.ReactNode;
  /** Classes do contêiner rolável (fundo, cor, padding, tamanho da fonte). */
  className?: string;
}

// Saída de mvn/cypress/npm vem com cores ANSI; aqui é texto puro, então os códigos só sujariam a tela
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;?]*[A-Za-z]/g;
const stripAnsi = (value: string): string => value.replace(ANSI_PATTERN, '');

/** Corpo rolável de um console: colado no fim enquanto chega saída nova, com estado vazio opcional. */
export const ConsoleBody: React.FC<ConsoleBodyProps> = ({ text, lines, getLineClass, empty, className = '' }) => {
  const hasContent = lines ? lines.length > 0 : !!text;
  const { ref, onScroll } = useStickToBottom<HTMLDivElement>([text, lines]);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className={`flex-1 overflow-y-auto font-mono leading-relaxed select-text ${className}`}
    >
      {!hasContent
        ? empty
        : lines
          ? lines.map((line, idx) => (
              <div key={idx} className={`whitespace-pre-wrap ${getLineClass ? getLineClass(line) : ''}`}>
                {stripAnsi(line)}
              </div>
            ))
          : stripAnsi(text ?? '')}
    </div>
  );
};
