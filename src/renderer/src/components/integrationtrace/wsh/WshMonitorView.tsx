import React from 'react';
import { Database } from 'lucide-react';
import { useWshMonitor } from '../../../hooks/integration/useWshMonitor';
import { WshMonitorFilters } from './WshMonitorFilters';
import { WshItemList } from './WshItemList';
import { WshItemDetail } from './WshItemDetail';

interface WshMonitorViewProps {
  settingsVersion?: number;
  onOpenSettings: () => void;
}

/** Aba "Monitor do WSH": filtros no topo, itens encontrados à esquerda e o item aberto à direita. */
export const WshMonitorView: React.FC<WshMonitorViewProps> = ({ settingsVersion, onOpenSettings }) => {
  const monitor = useWshMonitor(settingsVersion);
  const { filters } = monitor;

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      <WshMonitorFilters
        routes={monitor.routes}
        routesError={monitor.routesError}
        routeId={filters.routeId}
        text={filters.text}
        status={filters.status}
        lookbackHours={filters.lookbackHours}
        loading={monitor.loading}
        error={monitor.error}
        resultCount={monitor.items?.length}
        limit={monitor.limit}
        onRouteChange={filters.setRouteId}
        onTextChange={filters.setText}
        onStatusChange={filters.setStatus}
        onLookbackChange={filters.setLookbackHours}
        onSearch={() => void monitor.search()}
        onOpenSettings={onOpenSettings}
      />

      {monitor.items === null ? (
        <div className="bg-card border border-border rounded-xl p-6 space-y-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> O que o WSH gravou
          </h2>
          <p className="text-xs text-muted-foreground">
            Escolha a rota e o dado, como no monitor do WSH, e clique em Buscar. O Hub lê a PCINTEGRACAOCORE pela conexão Oracle da
            camada WinThor, só leitura e sem credencial do PDVSync, e mostra o status, a resposta do PDVSync e em que ponto o item parou.
          </p>
          <p className="text-2xs text-muted-foreground">
            Vale para os dois sentidos: envio (WinThor → PDVSync) e recebimento pelo ERP (vendas, pedidos e caixa). Os processos online do
            PDVOmni, como pré-venda e crédito, vão direto ao WinThor sem passar pelo WSH: estão na aba Online do PDV.
          </p>
        </div>
      ) : monitor.items.length === 0 ? (
        <p className="bg-card border border-border rounded-xl p-6 text-xs text-muted-foreground">Nenhum item encontrado com esses filtros.</p>
      ) : (
        // Em tela larga a lista e o detalhe ocupam o resto da altura e rolam cada um no seu quadro
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(18rem,25rem)_minmax(0,1fr)] gap-3 lg:flex-1 lg:min-h-0">
          <WshItemList items={monitor.items} selectedId={monitor.selected?.id} onSelect={monitor.select} />
          <div className="min-w-0 lg:min-h-0">
            {monitor.selected && <WshItemDetail item={monitor.selected} onCopy={() => void monitor.copySelected()} />}
          </div>
        </div>
      )}
    </div>
  );
};
