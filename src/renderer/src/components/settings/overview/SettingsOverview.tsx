import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';
import { NAV_THEME_GROUPS } from '../../header/headerNavConfig';
import { SECTION_TITLE_CLASS } from '../../ui/PageHeader';
import { SETTINGS_SECTIONS, SETTINGS_SECTION_GROUPS, type SettingsTab } from '../settingsSections';
import { buildSectionSummaries } from '../../../utils/settingsOverviewSummary';
import type { SectionStatus } from '../../../utils/settingsSectionStatus';
import type { SetupChecklistItemStatus } from '../../../utils/settingsListEditors';
import { OverviewEssentials } from './OverviewEssentials';
import { OverviewTransferCard } from './OverviewTransferCard';

interface SettingsOverviewProps {
  settings: AppSettings;
  checklist: Array<SetupChecklistItemStatus & { action?: () => void; actionLabel?: string }>;
  statuses: Partial<Record<SettingsTab, SectionStatus>>;
  onOpenSection: (tab: SettingsTab) => void;
  importExport: {
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleExportSettings: (sanitizePasswords: boolean) => void;
    handleImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

const TOTAL_MODULES = NAV_THEME_GROUPS.reduce((sum, group) => sum + group.items.length, 0);

const SummaryPill: React.FC<{ status?: SectionStatus; text: string }> = ({ status, text }) => {
  if (status?.kind === 'pending') {
    return <span className="text-xs font-mono font-semibold rounded-full px-2 py-0.5 bg-warning/10 text-warning">falta {status.count}</span>;
  }
  if (status?.kind === 'optional' && !text) {
    return <span className="text-xs text-muted-foreground">opcional</span>;
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
      {status?.kind === 'ok' && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
      <span className="truncate font-mono">{text}</span>
    </span>
  );
};

/** Primeira seção das Configurações: os essenciais, a situação de cada área e o importar/exportar. */
export const SettingsOverview: React.FC<SettingsOverviewProps> = ({ settings, checklist, statuses, onOpenSection, importExport }) => {
  const summaries = useMemo(() => buildSectionSummaries(settings, TOTAL_MODULES), [settings]);
  return (
    <div className="space-y-4">
      <OverviewEssentials checklist={checklist} />

      <section aria-labelledby="overview-areas" className="space-y-2.5">
        <h3 id="overview-areas" className={SECTION_TITLE_CLASS}>
          Por área
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {SETTINGS_SECTION_GROUPS.filter((g) => g.title).map((group) => (
            <div key={group.title} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="font-mono text-xs font-bold tracking-[0.14em] uppercase text-muted-foreground pb-1">{group.title}</div>
              <ul className="divide-y divide-border">
                {group.sections.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onOpenSection(id)}
                      className="w-full min-h-10 flex items-center justify-between gap-3 text-left cursor-pointer group"
                    >
                      <span className="text-sm font-medium text-foreground group-hover:text-primary">{SETTINGS_SECTIONS[id].label}</span>
                      <SummaryPill status={statuses[id]} text={summaries[id] ?? ''} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <OverviewTransferCard
        fileInputRef={importExport.fileInputRef}
        onExport={importExport.handleExportSettings}
        onImportFileChange={importExport.handleImportFileChange}
      />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <span className="shrink-0 font-mono rounded-full bg-muted px-2 py-0.5">como salvar</span>
        <span>
          Tudo o que você muda fica pendente até clicar em <strong className="text-foreground">Salvar alterações</strong> na barra
          que aparece no rodapé. O que grava direto tem a etiqueta <span className="font-mono">aplica na hora</span>.
        </span>
      </p>
    </div>
  );
};
