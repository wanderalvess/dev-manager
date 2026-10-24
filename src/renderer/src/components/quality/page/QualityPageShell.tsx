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
    <div className="border-b border-border bg-card px-7 py-4 flex items-center gap-3 shrink-0">
      <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight leading-tight">{title}</h1>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </div>
);
