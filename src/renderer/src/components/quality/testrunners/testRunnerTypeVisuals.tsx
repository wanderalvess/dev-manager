import React from 'react';
import { Terminal, FileCode2, Globe, Send } from 'lucide-react';
import type { TestRunnerType } from '../../../../../shared/types';


export const TYPE_ICONS: Record<TestRunnerType, React.ReactNode> = {
  maven: <FileCode2 className="w-4 h-4 text-orange-400" />,
  playwright: <Globe className="w-4 h-4 text-emerald-400" />,
  cypress: <Globe className="w-4 h-4 text-teal-400" />,
  newman: <Send className="w-4 h-4 text-amber-400" />,
  custom: <Terminal className="w-4 h-4 text-blue-400" />
};

export const TYPE_BADGES: Record<TestRunnerType, { label: string; badgeClass: string }> = {
  maven: { label: 'Maven / Java', badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  playwright: { label: 'Playwright E2E', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cypress: { label: 'Cypress E2E', badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  newman: { label: 'Newman API', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  custom: { label: 'Script Custom', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
};
