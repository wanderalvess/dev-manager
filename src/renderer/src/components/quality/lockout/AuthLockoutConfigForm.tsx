import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Lock, Square } from 'lucide-react';
import type { AuthLockoutForm } from '../../../utils/authLockoutView';
import { AuthLockoutCheckPicker } from './AuthLockoutCheckPicker';
import { SectionTitle, TextField } from './lockoutFormFields';

interface AuthLockoutConfigFormProps {
  form: AuthLockoutForm;
  update: <K extends keyof AuthLockoutForm>(key: K, value: AuthLockoutForm[K]) => void;
  running: boolean;
  blocker: string | null;
  estimatedMinutes: number;
  onRun: () => void;
  onAbort: () => void;
}

/** Onde testar, com quais usuários e quais checagens. As senhas não são lembradas entre sessões. */
export const AuthLockoutConfigForm: React.FC<AuthLockoutConfigFormProps> = ({ form, update, running, blocker, estimatedMinutes, onRun, onAbort }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const text = (key: keyof AuthLockoutForm) => (value: string) => update(key, value as never);

  return (
    <form
      className="bg-card border border-border rounded-xl p-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!running) onRun();
      }}
    >
      <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-foreground flex gap-2">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <span>
          Bloqueia as contas de teste de propósito. Use só em <strong>homologação</strong>, com usuários dedicados.
        </span>
      </div>

      <SectionTitle>Ambiente</SectionTitle>
      <TextField id="lk-base" label="URL do WTA" value={form.baseUrl} onChange={text('baseUrl')} mono placeholder="http://localhost:8889" hint="Padrão: a URL do WTA de Configurações." />
      <TextField id="lk-logs" label="API de logs" value={form.logsUrl} onChange={text('logsUrl')} mono placeholder="http://localhost:81/winthor/ferramenta/servidor/v1/logs" />
      <TextField id="lk-file" label="Arquivo de log (winthor.log)" value={form.logFilePath} onChange={text('logFilePath')} mono hint="Padrão: <pasta do Karaf>/data/log/winthor.log. Só o que for escrito durante o teste é lido." />

      <SectionTitle>Usuários de teste</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <TextField id="lk-a-login" label="Usuário A" value={form.userALogin} onChange={text('userALogin')} mono placeholder="TESTE_A" />
        <TextField id="lk-a-pass" label="Senha de A" type="password" value={form.userAPassword} onChange={text('userAPassword')} />
        <TextField id="lk-b-login" label="Usuário B" value={form.userBLogin} onChange={text('userBLogin')} mono placeholder="TESTE_B" />
        <TextField id="lk-b-pass" label="Senha de B" type="password" value={form.userBPassword} onChange={text('userBPassword')} />
      </div>
      <p className="text-2xs text-muted-foreground">A fica bloqueado durante quase todo o teste; B é usado no bloqueio por usuário e na concorrência. As senhas não são salvas.</p>

      <AuthLockoutCheckPicker selected={form.checks} onChange={(checks) => update('checks', checks)} />

      <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={form.logSinkUnavailableConfirmed}
          onChange={(e) => update('logSinkUnavailableConfirmed', e.target.checked)}
        />
        <span>Já deixei o destino de logs indisponível por um mecanismo autorizado (habilita a checagem de falha no mecanismo de logs).</span>
      </label>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Regra e caminhos
      </button>
      {showAdvanced && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <TextField id="lk-threshold" label="Falhas que bloqueiam" type="number" value={form.threshold} onChange={text('threshold')} />
            <TextField id="lk-window" label="Janela (s)" type="number" value={form.windowSeconds} onChange={text('windowSeconds')} />
            <TextField id="lk-minutes" label="Durações a conferir (min)" value={form.lockMinutes} onChange={text('lockMinutes')} mono hint="Ex.: 4, 5" />
            <TextField id="lk-concurrency" label="Logins simultâneos" type="number" value={form.concurrency} onChange={text('concurrency')} hint="Com a conta bloqueada (máx. 10)." />
          </div>
          <TextField id="lk-login-path" label="Caminho do login" value={form.loginPath} onChange={text('loginPath')} mono />
          <TextField id="lk-logoff-path" label="Caminho do logoff" value={form.logoffPath} onChange={text('logoffPath')} mono hint="Vazio deixa a checagem de logoff como manual." />
          <TextField id="lk-pattern" label="Texto da resposta de bloqueio (regex)" value={form.lockedPattern} onChange={text('lockedPattern')} mono hint="Diferencia conta bloqueada de senha errada quando o servidor responde as duas com 401." />
        </div>
      )}

      {blocker && !running && (
        <p role="alert" className="text-xs text-warning flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{blocker}</span>
        </p>
      )}

      {running ? (
        <button
          type="button"
          onClick={onAbort}
          className="w-full h-10 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-medium text-sm rounded-[10px] transition-colors flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <Square className="w-3.5 h-3.5" />
          <span>Interromper</span>
        </button>
      ) : (
        <button
          type="submit"
          disabled={!!blocker}
          className="w-full h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm rounded-[10px] transition-colors flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          <span>Rodar teste (~{estimatedMinutes} min)</span>
        </button>
      )}
    </form>
  );
};
