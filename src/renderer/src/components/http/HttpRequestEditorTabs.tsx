import React, { useState } from 'react';
import {
  HttpRequestItem,
  HttpAuthConfig,
  HttpRequestBody,
  HttpKeyValueItem
} from '../../../../shared/types';
import { HttpKeyValueEditor } from './HttpKeyValueEditor';
import { MonacoJsonViewer } from './MonacoJsonViewer';
import { Wand2, Key, ShieldCheck, Lock, Copy, Check } from 'lucide-react';
import { showToast } from '../ToastHost';

interface HttpRequestEditorTabsProps {
  request: HttpRequestItem;
  onRequestChange: (updated: HttpRequestItem) => void;
  activeToken?: string;
  onLoginWinThorPrompt?: () => void;
}

type TabType = 'params' | 'headers' | 'auth' | 'body';

export const HttpRequestEditorTabs: React.FC<HttpRequestEditorTabsProps> = ({
  request,
  onRequestChange,
  activeToken,
  onLoginWinThorPrompt
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('params');
  const [bodyCopied, setBodyCopied] = useState(false);

  const updateField = <K extends keyof HttpRequestItem>(field: K, value: HttpRequestItem[K]) => {
    onRequestChange({ ...request, [field]: value });
  };

  const handleBeautifyJson = () => {
    if (request.body?.mode === 'raw-json' && request.body.raw) {
      try {
        const parsed = JSON.parse(request.body.raw);
        const formatted = JSON.stringify(parsed, null, 2);
        updateField('body', { ...request.body, raw: formatted });
        showToast('JSON formatado com sucesso!', 'success');
      } catch {
        showToast('JSON inválido. Verifique a sintaxe antes de formatar.', 'info');
      }
    }
  };

  const handleCopyBody = () => {
    if (!request.body?.raw) return;
    navigator.clipboard.writeText(request.body.raw);
    setBodyCopied(true);
    showToast('Corpo da requisição copiado!', 'success');
    setTimeout(() => setBodyCopied(false), 2000);
  };

  const paramsCount = request.params?.filter((p) => p.enabled).length || 0;
  const headersCount = request.headers?.filter((h) => h.enabled).length || 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Abas */}
      <div className="flex items-center gap-1 px-3 border-b border-border bg-card/40">
        <button
          type="button"
          onClick={() => setActiveTab('params')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'params'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Params {paramsCount > 0 && <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px]">{paramsCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('headers')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'headers'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Headers {headersCount > 0 && <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px]">{headersCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auth')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'auth'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Auth {request.auth?.type !== 'none' && <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">•</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('body')}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'body'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Body {request.body?.mode !== 'none' && <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">•</span>}
        </button>
      </div>

      {/* Conteúdo da Aba */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'params' && (
          <HttpKeyValueEditor
            items={request.params || []}
            onChange={(items) => updateField('params', items)}
            keyPlaceholder="Parâmetro (ex: filial)"
            valuePlaceholder="Valor (ex: 1)"
          />
        )}

        {activeTab === 'headers' && (
          <HttpKeyValueEditor
            items={request.headers || []}
            onChange={(items) => updateField('headers', items)}
            keyPlaceholder="Cabeçalho (ex: Content-Type)"
            valuePlaceholder="Valor (ex: application/json)"
          />
        )}

        {activeTab === 'auth' && (
          <div className="p-4 space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tipo de Autenticação</label>
              <select
                value={request.auth?.type || 'inherit'}
                onChange={(e) => updateField('auth', { ...request.auth, type: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="inherit">Herdar da Coleção / Variável TOKEN</option>
                <option value="winthor-auth">Autenticação WinThor (Automática)</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth (Usuário / Senha)</option>
                <option value="none">Nenhuma (No Auth)</option>
              </select>
            </div>

            {(request.auth?.type === 'winthor-auth' || request.auth?.type === 'inherit') && (
              <div className="p-3 bg-muted/30 border border-border rounded text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Autenticação Integrada com WinThor</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Utiliza automaticamente a variável de ambiente <code className="text-primary font-mono font-semibold">TOKEN</code> injetando no header <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.
                </p>
                {activeToken && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Token ativo atual: <code className="text-xs font-mono text-foreground">{activeToken.substring(0, 16)}...</code></span>
                  </div>
                )}
                {onLoginWinThorPrompt && (
                  <button
                    type="button"
                    onClick={onLoginWinThorPrompt}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded text-xs font-medium transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Obter Novo Token WinThor</span>
                  </button>
                )}
              </div>
            )}

            {request.auth?.type === 'bearer' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">Bearer Token</label>
                <input
                  type="text"
                  value={request.auth.token || ''}
                  onChange={(e) => updateField('auth', { ...request.auth, token: e.target.value })}
                  placeholder="eyJhbGciOiJIUzI1NiJ9... ou {{TOKEN}}"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {request.auth?.type === 'basic' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Usuário</label>
                  <input
                    type="text"
                    value={request.auth.username || ''}
                    onChange={(e) => updateField('auth', { ...request.auth, username: e.target.value })}
                    placeholder="ex: admin ou {{LOGIN}}"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Senha</label>
                  <input
                    type="password"
                    value={request.auth.password || ''}
                    onChange={(e) => updateField('auth', { ...request.auth, password: e.target.value })}
                    placeholder="Senha ou {{SENHA}}"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'body' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/20">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Formato:</span>
                <select
                  value={request.body?.mode || 'none'}
                  onChange={(e) => updateField('body', { ...request.body, mode: e.target.value as any })}
                  className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="none">Nenhum (None)</option>
                  <option value="raw-json">JSON (raw)</option>
                  <option value="raw-text">Texto Puro (raw)</option>
                  <option value="form-urlencoded">x-www-form-urlencoded</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                {request.body?.mode === 'raw-json' && (
                  <button
                    type="button"
                    onClick={handleBeautifyJson}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors cursor-pointer"
                    title="Formatar e indentar JSON automaticamente"
                  >
                    <Wand2 className="w-3 h-3 text-primary" />
                    <span>Formatar JSON</span>
                  </button>
                )}

                {request.body?.raw && (
                  <button
                    type="button"
                    onClick={handleCopyBody}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors cursor-pointer"
                    title="Copiar corpo da requisição"
                  >
                    {bodyCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    <span>{bodyCopied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-2">
              {request.body?.mode === 'none' ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Esta requisição não possui corpo (Body).
                </div>
              ) : request.body?.mode === 'form-urlencoded' ? (
                <HttpKeyValueEditor
                  items={request.body.formData || []}
                  onChange={(items) => updateField('body', { ...request.body, formData: items })}
                  keyPlaceholder="Campo"
                  valuePlaceholder="Valor"
                />
              ) : (
                <MonacoJsonViewer
                  value={request.body?.raw || ''}
                  onChange={(raw) => updateField('body', { ...request.body, raw })}
                  language={request.body?.mode === 'raw-json' ? 'json' : 'plaintext'}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
