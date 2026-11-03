import React, { useState } from 'react';
import type { InfrOriginCheckState } from '../../../../hooks/containers/useInfrOriginCheck';

const INPUT =
  'w-full h-9 bg-background border border-input rounded-lg px-2.5 text-sm text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-warning/60';

/** Usuário e senha do WTA de origem, quando o login falta ou foi recusado: salva nas Configurações e confere de novo. */
export const InfrWtaLoginForm: React.FC<{ o: InfrOriginCheckState }> = ({ o }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    <form onSubmit={save} className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <label htmlFor="nv-wta-login" className="block text-2xs font-semibold text-foreground mb-1">
          Usuário do WinThor
        </label>
        <input id="nv-wta-login" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" placeholder="ex.: PCADMIN" className={INPUT} />
      </div>
      <div className="w-48">
        <label htmlFor="nv-wta-senha" className="block text-2xs font-semibold text-foreground mb-1">
          Senha
        </label>
        <input id="nv-wta-senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" className={INPUT} />
      </div>
      <button type="submit" disabled={saving || !login.trim() || !password} className="h-9 px-4 rounded-lg bg-warning text-white text-xs font-semibold cursor-pointer disabled:opacity-50">
        {saving ? 'Testando...' : 'Salvar e testar'}
      </button>
      <p className="basis-full text-2xs text-muted-foreground">
        Fica salvo em Configurações → Rotinas WinThor (Usuário WTA), criptografado. A senha não volta para a tela.
      </p>
      {error && <p className="basis-full text-2xs text-danger">{error}</p>}
    </form>
  );
};
