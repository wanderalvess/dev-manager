import React from 'react';

/** Marca o que grava direto no disco, fora da barra "Salvar alterações". */
export const AppliesNowTag: React.FC = () => (
  <span
    className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
    title="Esta ação grava na hora, sem passar pela barra de salvar"
  >
    aplica na hora
  </span>
);
