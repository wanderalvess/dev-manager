import React from 'react';
import { InfrDockerGuide } from '../guides/InfrDockerGuide';

/** Guias longos da Central de Ajuda: como as peças funcionam juntas, não só onde clicar. */
export const HelpGuidesTab: React.FC<{ openLink: (url: string) => void }> = ({ openLink }) => (
  <div className="p-5 md:p-6 bg-card border border-border/80 rounded-xl">
    <InfrDockerGuide openLink={openLink} />
  </div>
);
