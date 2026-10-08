import React, { useEffect, useState, useCallback } from 'react';
import { Network, RotateCw, FolderOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OracleTnsEntry, ParseTnsNamesResult } from '../../../../shared/types';
import { apiBridge } from '../../services/apiBridge';

export interface OracleTnsSelectorProps {
  onSelectEntry: (entry: OracleTnsEntry) => void;
  selectedAlias?: string;
}

export const OracleTnsSelector: React.FC<OracleTnsSelectorProps> = ({
  onSelectEntry,
  selectedAlias
}) => {
  const [entries, setEntries] = useState<OracleTnsEntry[]>([]);
  const [filePath, setFilePath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTnsEntries = useCallback(async (customPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: ParseTnsNamesResult = await apiBridge.parseTnsNames(customPath);
      if (res.success) {
        setEntries(res.entries);
        setFilePath(res.filePath || '');
      } else {
        setEntries([]);
        setError(res.error || 'Nenhuma entrada encontrada.');
      }
    } catch (err: any) {
      setEntries([]);
      setError(err?.message || 'Falha ao ler tnsnames.ora');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTnsEntries();
  }, [loadTnsEntries]);

  const handleBrowseFile = async () => {
    if (window.electronAPI?.selectFile) {
      const selected = await window.electronAPI.selectFile({
        filters: [
          { name: 'Configuração Oracle (*.ora)', extensions: ['ora'] },
          { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
        ]
      });
      if (selected) {
        loadTnsEntries(selected);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const alias = e.target.value;
    if (!alias) return;
    const match = entries.find((item) => item.alias === alias);
    if (match) {
      onSelectEntry(match);
    }
  };

  return (
    <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
          <Network className="w-3.5 h-3.5 text-orange-500" />
          <span>Buscar no tnsnames.ora</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => loadTnsEntries(filePath || undefined)}
            disabled={loading}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer disabled:opacity-50"
            title="Recarregar tnsnames.ora"
          >
            <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleBrowseFile}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer"
            title="Selecionar outro arquivo tnsnames.ora"
          >
            <FolderOpen className="w-3 h-3 text-orange-500" />
          </button>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-1">
          <select
            value={selectedAlias || ''}
            onChange={handleChange}
            className="w-full bg-background border border-border/80 hover:border-primary/50 rounded-md p-1.5 text-foreground font-mono text-xs focus:outline-hidden focus:border-primary transition cursor-pointer"
          >
            <option value="">-- Selecione uma conexão TNS ({entries.length} encontradas) --</option>
            {entries.map((item) => {
              const target = item.serviceName
                ? `SVC: ${item.serviceName}`
                : item.sid
                ? `SID: ${item.sid}`
                : 'Oracle';
              return (
                <option key={item.alias} value={item.alias}>
                  {item.alias} → {item.host}:{item.port} ({target})
                </option>
              );
            })}
          </select>
          {filePath && (
            <p className="text-2xs text-muted-foreground font-mono truncate" title={filePath}>
              Origem: {filePath.split(/[\\/]/).pop()}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-background/50 p-2 rounded border border-border/50">
          <div className="flex items-center gap-1.5 min-w-0">
            {error ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="truncate">
              {error ? 'tnsnames.ora não localizado' : 'Nenhuma entrada TNS encontrada'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleBrowseFile}
            className="text-2xs text-primary hover:underline font-bold shrink-0 ml-2 cursor-pointer"
          >
            Localizar arquivo
          </button>
        </div>
      )}
    </div>
  );
};
