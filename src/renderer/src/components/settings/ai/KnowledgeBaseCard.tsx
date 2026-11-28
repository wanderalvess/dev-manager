import React, { useState } from 'react';
import { BookOpen, Eye, EyeOff, FolderOpen, Search, UploadCloud } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';
import type { KnowledgeBaseSettings } from '../../../../../shared/knowledgeBaseTypes';
import { formatImportSummary, kbKeyPlaceholder, normalizeKbUrl } from '../../../utils/knowledgeBaseView';
import { showToast } from '../../ToastHost';
import { SETTINGS_GHOST_BUTTON_CLASS, SETTINGS_INPUT_CLASS } from '../SettingsCard';

interface KnowledgeBaseCardProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const EMPTY: KnowledgeBaseSettings = { enabled: false, baseUrl: '', apiKey: '', sourcePath: '' };

/** Conexão com a Base de Conhecimento compartilhada (Agile Space) e importação do prompt-hub. */
export const KnowledgeBaseCard: React.FC<KnowledgeBaseCardProps> = ({ settings, setSettings }) => {
  const kb = settings.knowledgeBase ?? EMPTY;
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<'test' | 'import' | null>(null);
  const [status, setStatus] = useState('');

  const update = (patch: Partial<KnowledgeBaseSettings>) =>
    setSettings((prev) => ({ ...prev, knowledgeBase: { ...(prev.knowledgeBase ?? EMPTY), ...patch } }));

  const pickFolder = async () => {
    const selected = await window.electronAPI?.selectDirectory?.(kb.sourcePath || undefined);
    if (selected) update({ sourcePath: selected });
  };

  const run = async (kind: 'test' | 'import') => {
    setBusy(kind);
    setStatus('');
    try {
      if (kind === 'test') {
        const res = await window.electronAPI.kbSearch({ query: 'api', k: 1 });
        setStatus(`Conectado (busca ${res.mode}).`);
      } else {
        const unsubscribe = window.electronAPI.onKbImportProgress((p) => setStatus(`Enviando ${p.sent}/${p.total}...`));
        try {
          const summary = await window.electronAPI.kbImport();
          const text = formatImportSummary(summary);
          setStatus(text);
          showToast(`Importação concluída: ${text}`);
        } finally {
          unsubscribe();
        }
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 border border-border bg-card" id="field-knowledge-base">
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Base de Conhecimento (Agile Space)</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Documentação das APIs Java, páginas do TDN, prompts e skills em um só lugar. O Hub consulta pelo chat e pelas
        tools MCP <code>kb_*</code>. Salve as configurações antes de testar ou importar.
      </p>

      <label className="flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" checked={kb.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        Usar a Base de Conhecimento
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          URL do servidor
          <input
            className={SETTINGS_INPUT_CLASS}
            placeholder="https://servidor-do-agile-space"
            value={kb.baseUrl}
            onChange={(e) => update({ baseUrl: normalizeKbUrl(e.target.value) })}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Chave de API
          <div className="flex gap-2">
            <input
              className={SETTINGS_INPUT_CLASS}
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              placeholder={kbKeyPlaceholder(Boolean(settings.hasKnowledgeBaseKey))}
              value={kb.apiKey ?? ''}
              onChange={(e) => update({ apiKey: e.target.value })}
            />
            <button type="button" className={SETTINGS_GHOST_BUTTON_CLASS} onClick={() => setShowKey((v) => !v)} aria-label="Mostrar ou ocultar a chave">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>
      </div>

      <label className="space-y-1 text-xs text-muted-foreground block">
        Pasta do prompt-hub (clone local) para importar
        <div className="flex gap-2">
          <input
            className={SETTINGS_INPUT_CLASS}
            placeholder="Pasta onde o repositório prompt-hub foi clonado"
            value={kb.sourcePath ?? ''}
            onChange={(e) => update({ sourcePath: e.target.value })}
          />
          {typeof window.electronAPI?.selectDirectory === 'function' && (
            <button type="button" className={SETTINGS_GHOST_BUTTON_CLASS} onClick={pickFolder} aria-label="Escolher pasta">
              <FolderOpen size={14} />
            </button>
          )}
        </div>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={SETTINGS_GHOST_BUTTON_CLASS} disabled={busy !== null} onClick={() => run('test')}>
          <Search size={14} /> Testar conexão
        </button>
        <button type="button" className={SETTINGS_GHOST_BUTTON_CLASS} disabled={busy !== null} onClick={() => run('import')}>
          <UploadCloud size={14} /> Importar prompt-hub
        </button>
        {status && <span className="text-xs text-muted-foreground" role="status">{status}</span>}
      </div>
      <p className="text-2xs text-muted-foreground">
        A importação envia documentação de código e do TDN para o servidor configurado. Confirme que o destino está
        autorizado para esse conteúdo antes de importar.
      </p>
    </div>
  );
};
