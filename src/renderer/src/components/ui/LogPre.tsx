import React from 'react';

export const LogPre: React.FC<{ text: string; wrap?: boolean; className?: string }> = ({
  text,
  wrap = false,
  className = ''
}) => (
  <pre
    className={`font-mono text-2xs leading-relaxed bg-muted/30 border border-border rounded-xl p-3 select-text ${
      wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
    } ${className}`}
  >
    {text}
  </pre>
);
