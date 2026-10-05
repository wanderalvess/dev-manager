import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Clock, User, Tag, Key, Layers } from 'lucide-react';
import { QaCorePayloadItem, QaCoreSearchMode } from '../../../../../shared/types';
import { api } from '../../../services/apiBridge';
import { validateSearchTerm } from '../../../utils/qaPayloadFetchUtils';
import { QaPayloadResultsList } from './QaPayloadResultsList';

interface QaOraclePayloadTabProps {
  connectionId?: string;
  defaultFilial?: string;
  defaultCupom?: string;
  selectedItem: QaCorePayloadItem | null;
  onSelectItem: (item: QaCorePayloadItem | null) => void;
  onResultsChange?: (count: number) => void;
}

const SEARCH_TABS = [
  { id: 'cgcEnt', label: 'CPF/CNPJ (cgcEnt)', icon: User },
  { id: 'cupom', label: 'Cupom & Filial', icon: Tag },
  { id: 'chave', label: 'Chave NFC-e/NF-e', icon: Key },
  { id: 'idExterno', label: 'ID Externo/Interno', icon: Layers },
  { id: 'recent', label: 'Últimas Mensagens', icon: Clock }
] as const;

export const QaOraclePayloadTab: React.FC<QaOraclePayloadTabProps> = ({
  connectionId,
  defaultFilial = '1',
  defaultCupom = '',
  selectedItem,
  onSelectItem,
  onResultsChange
}) => {
  const [searchMode, setSearchMode] = useState<QaCoreSearchMode>('cgcEnt');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filialTerm, setFilialTerm] = useState<string>(defaultFilial);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [results, setResults] = useState<QaCorePayloadItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultCupom) {
      setSearchMode('cupom');
      setSearchTerm(defaultCupom);
    }
    setFilialTerm(defaultFilial || '1');
  }, [defaultCupom, defaultFilial]);

  const handleSearch = useCallback(async () => {
    const val = validateSearchTerm(searchMode, searchTerm);
    if (!val.isValid) {
      setError(val.message || 'Parâmetro de busca inválido.');
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const res = await api.qaSearchCorePayloads(
        {
          mode: searchMode,
          cgcEnt: searchMode === 'cgcEnt' ? searchTerm.trim() : undefined,
          numCupom: searchMode === 'cupom' ? searchTerm.trim() : undefined,
          codFilial: searchMode === 'cupom' ? filialTerm.trim() : undefined,
          chaveNfe: searchMode === 'chave' ? searchTerm.trim() : undefined,
          idExterno: searchMode === 'idExterno' ? searchTerm.trim() : undefined,
          limit: 20
        },
        connectionId
      );

      if (!res.success) {
        setError(res.error || 'Falha ao buscar registros na PCINTEGRACAOCORE.');
        setResults([]);
        onSelectItem(null);
        onResultsChange?.(0);
        return;
      }

      setResults(res.items);
      onResultsChange?.(res.items.length);
      if (res.items.length > 0) {
        onSelectItem(res.items[0]);
      } else {
        onSelectItem(null);
        setError('Nenhum registro encontrado em PCINTEGRACAOCORE para os filtros informados.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao consultar o banco Oracle.');
    } finally {
      setIsSearching(false);
    }
  }, [searchMode, searchTerm, filialTerm, connectionId, onSelectItem, onResultsChange]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Barra de Filtros e Modos */}
      <div className="p-3 border-b border-border bg-background/50 space-y-2.5 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
          {SEARCH_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = searchMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSearchMode(tab.id as QaCoreSearchMode);
                  setError(null);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-2"
        >
          {searchMode !== 'recent' && (
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  searchMode === 'cgcEnt'
                    ? 'Ex: 68886626088'
                    : searchMode === 'cupom'
                      ? 'Ex: 271454'
                      : searchMode === 'chave'
                        ? 'Chave com 44 dígitos'
                        : 'Ex: pdvsync-vendamensagem-...'
                }
                className="w-full bg-background border border-border rounded pl-8 pr-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          )}

          {searchMode === 'cupom' && (
            <div className="w-24">
              <input
                type="text"
                value={filialTerm}
                onChange={(e) => setFilialTerm(e.target.value)}
                placeholder="Filial"
                title="Código da Filial"
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>{isSearching ? 'Buscando...' : 'Buscar no Banco'}</span>
          </button>
        </form>
      </div>

      {/* Lista de Registros */}
      <div className="flex-1 overflow-hidden">
        <QaPayloadResultsList
          results={results}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          isSearching={isSearching}
          error={error}
        />
      </div>
    </div>
  );
};
