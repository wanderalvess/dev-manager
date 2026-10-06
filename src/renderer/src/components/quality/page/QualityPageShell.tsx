import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface QualityPageShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}

// Moldura comum das páginas de Qualidade: título e descrição da própria página.
export const QualityPageShell: React.FC<QualityPageShellProps> = ({ icon: Icon, title, description, children }) => (
  <div className="h-full flex flex-col overflow-hidden bg-background">
    <div className="border-b border-border bg-card px-6 py-3.5 flex items-center gap-2.5 shrink-0">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div>
        <h2 className="text-base font-bold text-foreground tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </div>
);
