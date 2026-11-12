import React, { useEffect } from 'react';

export const EscapeToClose: React.FC<{ onEscape: () => void }> = ({ onEscape }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape]);
  return null;
};
