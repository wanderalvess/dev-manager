import React from 'react';
import { AlertTriangle, Loader2, Play, Plus, Save, Trash2 } from 'lucide-react';
import { API_HTTP_METHODS, type ApiHttpMethod, type ApiScenario } from '../../../../../shared/apiScenarioTypes';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import { FIELD_CLASS, SectionTitle, TextField } from '../lockout/lockoutFormFields';
import { ApiRulesEditor } from './ApiRulesEditor';

interface ApiScenarioEditorProps {
  draft: ApiScenario;
  connections: DatabaseConnectionConfig[];
  onChange: (draft: ApiScenario) => void;
  isSaved: boolean;
  dirty: boolean;
  problem: string | null;
  error: string | null;
  running: boolean;
  onSave: () => void;
  onRun: () => void;
  onDelete: () => void;
}

const BUTTON = 'h-10 px-4 font-medium text-sm rounded-[10px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

/** Requisição (método, URL, autenticação, cabeçalhos, corpo) e as regras que a resposta precisa cumprir. */
export const ApiScenarioEditor: React.FC<ApiScenarioEditorProps> = ({ draft, connections, onChange, isSaved, dirty, problem, error, running, onSave, onRun, onDelete }) => {
  const set = <K extends keyof ApiScenario>(key: K, value: ApiScenario[K]) => onChange({ ...draft, [key]: value });
  const setHeader = (index: number, patch: Partial<ApiScenario['headers'][number]>) =>
    set('headers', draft.headers.map((h, i) => (i === index ? { ...h, ...patch } : h)));

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <TextField id="api-name" label="Nome do cenário" value={draft.name} onChange={(v) => set('name', v)} placeholder="Filiais do WTA respondem" />

      <SectionTitle>Requisição</SectionTitle>
      <div className="grid grid-cols-12 gap-2">
        <select aria-label="Método" value={draft.method} onChange={(e) => set('method', e.target.value as ApiHttpMethod)} className={`${FIELD_CLASS} col-span-3 font-mono`}>
          {API_HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          aria-label="URL"
          value={draft.url}
          onChange={(e) => set('url', e.target.value)}
          placeholder="{{wtaUrl}}/winthor/ferramenta/servidor/v1/logs"
          className={`${FIELD_CLASS} col-span-9 font-mono`}
          spellCheck={false}
        />
      </div>
      <p className="text-2xs text-muted-foreground">
        <code className="font-mono">{'{{wtaUrl}}'}</code> vira a URL do WTA de Configurações.
      </p>

      <div className="space-y-1">
        <label htmlFor="api-auth" className="text-xs font-bold text-foreground block">
          Autenticação
        </label>
        <select id="api-auth" value={draft.auth} onChange={(e) => set('auth', e.target.value === 'none' ? 'none' : 'settings-wta')} className={FIELD_CLASS}>
          <option value="settings-wta">Login do WTA de Configurações (token no Authorization e no cookie suukie)</option>
          <option value="none">Sem autenticação</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Cabeçalhos ({draft.headers.length})</span>
          <button type="button" className="text-2xs font-medium text-primary hover:underline flex items-center gap-1" onClick={() => set('headers', [...draft.headers, { key: '', value: '' }])}>
            <Plus className="w-3 h-3" /> Cabeçalho
          </button>
        </div>
        {draft.headers.map((header, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input aria-label="Nome do cabeçalho" value={header.key} onChange={(e) => setHeader(i, { key: e.target.value })} placeholder="X-Filial" className={`${FIELD_CLASS} col-span-5 font-mono`} />
            <input aria-label="Valor do cabeçalho" value={header.value} onChange={(e) => setHeader(i, { value: e.target.value })} placeholder="1" className={`${FIELD_CLASS} col-span-6 font-mono`} />
            <button type="button" aria-label="Remover cabeçalho" onClick={() => set('headers', draft.headers.filter((_, j) => j !== i))} className="col-span-1 flex items-center justify-center text-muted-foreground hover:text-danger">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <p className="text-2xs text-muted-foreground">Não coloque senha nem token aqui: os cabeçalhos ficam salvos em texto. Para autenticar, use o login do WTA.</p>
      </div>

      {draft.method !== 'GET' && (
        <div className="space-y-1">
          <label htmlFor="api-body" className="text-xs font-bold text-foreground block">
            Corpo (JSON)
          </label>
          <textarea
            id="api-body"
            value={draft.body ?? ''}
            onChange={(e) => set('body', e.target.value)}
            rows={6}
            spellCheck={false}
            className="w-full bg-card border border-border rounded-[10px] p-3 text-xs font-mono text-foreground focus:outline-hidden focus:border-primary"
            placeholder='{ "codfilial": "1" }'
          />
        </div>
      )}

      <ApiRulesEditor rules={draft.rules} connections={connections} onChange={(rules) => set('rules', rules)} />

      {(problem || error) && (
        <p role="alert" className={`text-xs flex items-start gap-1.5 ${error ? 'text-danger' : 'text-warning'}`}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error ?? problem}</span>
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={onRun} disabled={!!problem || running} className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isSaved && !dirty ? 'Rodar' : 'Rodar sem salvar'}
        </button>
        <button type="button" onClick={onSave} disabled={!!problem || !dirty} className={`${BUTTON} bg-muted hover:bg-muted/80 text-foreground border border-border`}>
          <Save className="w-4 h-4" />
          {isSaved ? 'Salvar alterações' : 'Salvar'}
        </button>
        {isSaved && (
          <button type="button" onClick={onDelete} className={`${BUTTON} text-danger hover:bg-danger/10 border border-border ml-auto`}>
            <Trash2 className="w-4 h-4" />
            Apagar
          </button>
        )}
      </div>
    </div>
  );
};
