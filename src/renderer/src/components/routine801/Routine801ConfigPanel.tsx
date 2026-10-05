import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ROUTINE801_DEFAULT_URL } from '../../utils/routine801ModalUtils';

interface Routine801ConfigPanelProps {
  serverUrlInput: string;
  isTestingConnection: boolean;
  connectionHealth: { ok: boolean; message: string } | null;
  onChangeUrl: (value: string) => void;
  onTestConnection: () => void;
  onSave: () => void;
}

export const Routine801ConfigPanel: React.FC<Routine801ConfigPanelProps> = ({
  serverUrlInput,
  isTestingConnection,
  connectionHealth,
  onChangeUrl,
  onTestConnection,
  onSave
}) => (
  <div className="px-5 py-3 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0 animate-in slide-in-from-top-2 duration-150">
    <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
      <label htmlFor="routine801-url-input" className="text-muted-foreground font-medium whitespace-nowrap">
        URL da Ferramenta Servidor (WTA):
      </label>
      <div className="flex flex-1 items-center gap-1.5 max-w-lg">
        <input
          id="routine801-url-input"
          type="text"
          value={serverUrlInput}
          onChange={(e) => onChangeUrl(e.target.value)}
          placeholder="http://localhost:8889"
          className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => onChangeUrl(ROUTINE801_DEFAULT_URL)}
          className="px-2 py-1 text-[11px] font-mono rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Usar localhost:8889"
        >
          localhost
        </button>
        <button
          type="button"
          onClick={() => onChangeUrl('http://127.0.0.1:8889')}
          className="px-2 py-1 text-[11px] font-mono rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Usar 127.0.0.1:8889 (IPv4 direto)"
        >
          127.0.0.1
        </button>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onTestConnection}
        disabled={isTestingConnection}
        className="px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
      >
        {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
      </button>
      <button
        onClick={onSave}
        className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:opacity-90"
      >
        Salvar e Sincronizar
      </button>
    </div>
    {connectionHealth && (
      <div
        className={`w-full text-xs px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 ${
          connectionHealth.ok
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        }`}
      >
        {connectionHealth.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
        <span>{connectionHealth.message}</span>
      </div>
    )}
  </div>
);
