import React from 'react';
import { Terminal, FileCode2, Globe, Send } from 'lucide-react';
import type { TestRunnerType } from '../../../../../shared/types';


export const TYPE_ICONS: Record<TestRunnerType, React.ReactNode> = {
  maven: <FileCode2 className="w-4 h-4 text-orange-400" />,
  playwright: <Globe className="w-4 h-4 text-success" />,
  cypress: <Globe className="w-4 h-4 text-teal-400" />,
  newman: <Send className="w-4 h-4 text-warning" />,
  custom: <Terminal className="w-4 h-4 text-blue-400" />
};

export const TYPE_BADGES: Record<TestRunnerType, { label: string; badgeClass: string }> = {
  maven: { label: 'Maven / Java', badgeClass: 'bg-warning/10 text-warning' },
  playwright: { label: 'Playwright E2E', badgeClass: 'bg-success/10 text-success' },
  cypress: { label: 'Cypress E2E', badgeClass: 'bg-success/10 text-success' },
  newman: { label: 'Newman API', badgeClass: 'bg-warning/10 text-warning' },
  custom: { label: 'Script Custom', badgeClass: 'bg-info/10 text-info' }
};
