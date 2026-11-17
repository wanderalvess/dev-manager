import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plug, RefreshCw } from 'lucide-react';
import type { AppSettings, GitProjectInfo } from '../../../shared/types';
import { IntegrationCard } from '../components/integrations/IntegrationCard';
import { ApiMonitorPanel } from '../components/integrations/ApiMonitorPanel';
import {
  buildIntegrations,
  countIntegrationsByFilter,
  filterIntegrations,
  INTEGRATION_GROUP_TITLES,
  type IntegrationFilter,
  type IntegrationGroupId,
  type IntegrationItem,
  type IntegrationLiveState
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
  { id: 'attention', label: 'Com problema' },
  { id: 'unconfigured', label: 'Não configuradas' }
];

const GROUP_ORDER: IntegrationGroupId[] = ['ai', 'code', 'quality'];

type LoadState = 'loading' | 'ready' | 'error';

/** Tudo o que o Hub Manager conecta, num lugar só; cada cartão leva à configuração daquela integração. */
export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({
  projects,
  settingsVersion,
  onNavigate,
  onNavigateToHelp
}) => {
  const [settings, setSettings] = useState<Partial<AppSettings> | null>(null);
  const [live, setLive] = useState<IntegrationLiveState>({});
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [filter, setFilter] = useState<IntegrationFilter>('all');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    const api = window.electronAPI;
    const settingsPromise = api?.getSettings ? api.getSettings() : Promise.reject(new Error('API indisponível'));
    // O receptor OTLP é o único estado que dá para conferir ao vivo sem gastar cota de API de terceiros.
    const apmPromise = api?.getApmReceiverStatus ? api.getApmReceiverStatus() : Promise.resolve(null);
    Promise.allSettled([settingsPromise, apmPromise]).then(([s, apm]) => {
      if (cancelled) return;
      if (s.status === 'fulfilled') {
        setSettings(s.value);
        setLoadState('ready');
      } else {
        setLoadState('error');
      }
      setLive({ apmReceiver: apm.status === 'fulfilled' ? apm.value : null });
      setCheckedAt(Date.now());
    });
    return () => {
      cancelled = true;
    };
  }, [settingsVersion, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const items = useMemo(() => buildIntegrations(settings, projects, live), [settings, projects, live]);
  const counts = useMemo(() => countIntegrationsByFilter(items), [items]);
  const visible = useMemo(() => filterIntegrations(items, filter), [items, filter]);

  // Some o filtro "Com problema" quando o problema é resolvido, para não ficar numa lista vazia.
  useEffect(() => {
    if (filter === 'attention' && counts.attention === 0) setFilter('all');
  }, [filter, counts.attention]);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg leading-tight font-bold tracking-tight text-foreground flex items-center gap-3">
            <Plug className="w-6 h-6 text-muted-foreground" />
            Integrações
          </h1>
          <p className="text-sm text-muted-foreground">
            Tudo o que o Hub Manager conecta, num lugar só. Cada cartão leva para a configuração daquela integração.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {checkedAt && (
            <span className="text-[13px] text-muted-foreground">
              Atualizado às {new Date(checkedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loadState === 'loading'}
            className="h-10 px-3 rounded-[10px] text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {loadState === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-[12px] bg-danger/10 text-danger text-sm">
          Não foi possível ler as configurações; os estados abaixo podem estar incompletos.
          <button type="button" onClick={refresh} className="font-medium underline cursor-pointer">
            Tentar de novo
          </button>
        </div>
      )}

      <div role="tablist" aria-label="Filtrar integrações" className="flex flex-wrap items-center gap-2">
        {FILTERS.filter(({ id }) => id !== 'attention' || counts.attention > 0).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`h-8 px-3 rounded-full text-sm transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              filter === id
                ? 'bg-accent text-accent-foreground font-medium'
                : id === 'attention'
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {label}
            {loadState !== 'loading' && <span className="tabular-nums opacity-70">{counts[id]}</span>}
          </button>
        ))}
      </div>

      {loadState === 'loading' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true" aria-label="Carregando integrações">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-[168px] rounded-[14px] border border-border bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {visible.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma integração neste filtro.</p>}

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
        </>
      )}

      <ApiMonitorPanel />

      <p className="text-[13px] text-muted-foreground pt-2">
        Também: importação de coleções do Postman no API Studio · API REST e WebSocket no modo web/Docker.
      </p>
    </div>
  );
};
