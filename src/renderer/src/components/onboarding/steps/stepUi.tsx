import React from 'react';

// Peças visuais repetidas entre as etapas do onboarding.

export const Eyebrow: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <span className="font-mono text-xs font-bold tracking-[0.14em] text-primary">
    ETAPA {String(n).padStart(2, '0')} · {children}
  </span>
);

export const StepTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="m-0 text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">{children}</h2>
);

export const StepLead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="m-0 max-w-3xl text-base leading-relaxed text-muted-foreground">{children}</p>
);
