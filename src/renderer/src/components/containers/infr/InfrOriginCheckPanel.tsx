import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCw, XCircle } from 'lucide-react';
import type { InfrReviewStatus } from '../../../../../shared/infrNewVersionReview';
import type { InfrOriginCheckState } from '../../../hooks/containers/useInfrOriginCheck';
const NV_INPUT =
  'w-full bg-background border border-input rounded-[10px] px-3 py-2 text-sm text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-warning/60';

const ICON: Record<InfrReviewStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
  block: <XCircle className="w-4 h-4 text-danger shrink-0" />
};

/** Passo 1: confere a pasta, o WTA de origem e o login antes de a pessoa preencher o resto. */
export const InfrOriginCheckPanel: React.FC<{ o: InfrOriginCheckState; from: string }> = ({ o, from }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const r = o.result;
  const asks = r?.items.some((it) => it.askCredentials);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const err = await o.saveCredentials(login, password);
      if (err) setError(err);
      else setPassword('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Conferência da origem" className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-bold text-foreground">Conferência do {from ? `wta-${from}` : 'ambiente de origem'}</p>
        <button
          type="button"
          onClick={o.check}
          disabled={o.loading || !from}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${o.loading ? 'animate-spin' : ''}`} /> Conferir de novo
        </button>
      </div>
      {!r && <p className="text-xs text-muted-foreground">{o.loading ? 'Conferindo a pasta, o WTA e o login...' : 'Escolha a origem para conferir.'}</p>}
      {r && !r.success && <p className="text-xs text-danger break-words">{r.error}</p>}
      {r?.success && (
        <ul className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {r.items.map((it) => (
            <li key={it.id} className="flex gap-2 p-2.5 rounded-lg bg-muted/30 min-w-0">
              {ICON[it.status]}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{it.title}</p>
                <p className="text-2xs text-foreground/80 mt-0.5 leading-relaxed break-words">{it.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {asks && (
        <form onSubmit={save} className="flex flex-wrap items-end gap-3 pt-1">
          <div className="w-48">
            <label htmlFor="nv-wta-login" className="block text-2xs font-semibold text-foreground mb-1">Usuário do WinThor</label>
            <input id="nv-wta-login" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" placeholder="ex.: PCADMIN" className={NV_INPUT} />
          </div>
          <div className="w-48">
            <label htmlFor="nv-wta-senha" className="block text-2xs font-semibold text-foreground mb-1">Senha</label>
            <input id="nv-wta-senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" className={NV_INPUT} />
          </div>
          <button
            type="submit"
            disabled={saving || !login.trim() || !password}
            className="h-9 px-4 rounded-lg bg-warning text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Testando...' : 'Salvar e testar'}
          </button>
          <p className="basis-full text-2xs text-muted-foreground">
            Fica salvo em Configurações → Rotinas WinThor (Usuário WTA), criptografado. A senha não volta para a tela.
          </p>
          {error && <p className="basis-full text-2xs text-danger">{error}</p>}
        </form>
      )}
    </section>
  );
};
