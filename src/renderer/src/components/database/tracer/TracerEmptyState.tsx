import React from 'react';

export const TracerEmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
    {icon}
    <p className="font-semibold text-foreground">{title}</p>
    <span className="text-[11px] opacity-70">{subtitle}</span>
  </div>
);
