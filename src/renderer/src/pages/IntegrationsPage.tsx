import React, { useEffect, useMemo, useState } from 'react';
import { Plug } from 'lucide-react';
import type { AppSettings, GitProjectInfo } from '../../../shared/types';
import { IntegrationCard } from '../components/integrations/IntegrationCard';
import {
  buildIntegrations,
  filterIntegrations,
  INTEGRATION_GROUP_TITLES,
  type IntegrationFilter,
  type IntegrationGroupId,
  type IntegrationItem
} from '../utils/integrationsStatus';
import { requestSettingsTab } from '../utils/settingsDeepLink';
import type { SettingsTab } from '../components/settings/settingsSearchData';

interface IntegrationsPageProps {
  projects: GitProjectInfo[];
  settingsVersion?: number;
  onNavigate: (tab: string) => void;
  onNavigateToHelp: (search?: string) => void;
}

const FILTERS: { id: IntegrationFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Ativas' },
  { id: 'unconfigured', label: 'Não configuradas' }
];

const GROUP_ORDER: IntegrationGroupId[] = ['ai', 'code', 'quality'];

/** Tudo o que o Hub Manager conecta, num lugar só; cada cartão leva à configuração daquela integração. */
export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({
  projects,
  settingsVersion,
  onNavigate,
  onNavigateToHelp
}) => {
  const [settings, setSettings] = useState<Partial<AppSettings> | null>(null);
  const [filter, setFilter] = useState<IntegrationFilter>('all');

  useEffect(() => {
    let cancelled = false;
    window.electronAPI
      ?.getSettings?.()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        if (!cancelled) setSettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, [settingsVersion]);

  const items = useMemo(() => buildIntegrations(settings, projects), [settings, projects]);
  const visible = useMemo(() => filterIntegrations(items, filter), [items, filter]);

  const open = (item: IntegrationItem) => {
    const { target } = item;
    if (target.kind === 'help') onNavigateToHelp(target.search);
    else if (target.kind === 'settings') {
      requestSettingsTab(target.tab as SettingsTab);
      onNavigate('settings');
    } else onNavigate(target.tab);
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-3 md:px-5 md:py-4 space-y-3">
      <div className="space-y-1">
        <h1 className="text-lg leading-tight font-bold tracking-tight text-foreground flex items-center gap-3">
          <Plug className="w-6 h-6 text-muted-foreground" />
          Integrações
        </h1>
        <p className="text-sm text-muted-foreground">
          Tudo o que o Hub Manager conecta, num lugar só. Cada cartão leva para a configuração daquela integração.
        </p>
      </div>

      <div role="tablist" aria-label="Filtrar integrações" className="flex items-center gap-2">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`h-8 px-3 rounded-full text-sm transition-colors cursor-pointer ${
              filter === id
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma integração neste filtro.</p>
      )}

      {GROUP_ORDER.map((groupId) => {
        const groupItems = visible.filter((i) => i.group === groupId);
        if (groupItems.length === 0) return null;
        const { title, subtitle } = INTEGRATION_GROUP_TITLES[groupId];
        return (
          <section key={groupId} className="space-y-3" aria-label={title}>
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupItems.map((item) => (
                <IntegrationCard key={item.id} item={item} onOpen={open} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-[13px] text-muted-foreground pt-2">
        Também: importação de coleções do Postman no API Studio · API REST e WebSocket no modo web/Docker.
      </p>
    </div>
  );
};
