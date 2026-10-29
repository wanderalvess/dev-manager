import React from 'react';
import { ClipboardCopy, Loader2, ShieldAlert } from 'lucide-react';
import { AUTH_LOCKOUT_STATUS_LABELS } from '../../../../../shared/authLockoutReport';
import type { AuthLockoutCheckStatus } from '../../../../../shared/authLockoutTypes';
import { useAuthLockoutRun } from '../../../hooks/quality/lockout/useAuthLockoutRun';
import { STATUS_TONE, summarizeChecks } from '../../../utils/authLockoutView';
import { TONE_BADGE } from '../../integrationtrace/toneClasses';
import { AuthLockoutActivityLog } from './AuthLockoutActivityLog';
import { AuthLockoutChecksList } from './AuthLockoutChecksList';
import { AuthLockoutConfigForm } from './AuthLockoutConfigForm';

const SUMMARY_ORDER: AuthLockoutCheckStatus[] = ['failed', 'warning', 'manual', 'info', 'passed', 'skipped'];

/** Homologação → Bloqueio de Login: regras de bloqueio do login do WinThor validadas com tentativas controladas. */
export const AuthLockoutPanel: React.FC = () => {
  const lockout = useAuthLockoutRun();
  const counts = summarizeChecks(lockout.checks);

  if (!lockout.form) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        {lockout.error ? <span className="text-danger">{lockout.error}</span> : <Loader2 className="w-4 h-4 animate-spin" />}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <AuthLockoutConfigForm
          form={lockout.form}
          update={lockout.update}
          running={lockout.running}
          blocker={lockout.blocker}
          estimatedMinutes={lockout.estimatedMinutes}
          onRun={lockout.run}
          onAbort={lockout.abort}
        />
      </div>

      <div className="lg:col-span-2 space-y-3 min-w-0">
        <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Regras de bloqueio</span>
            {SUMMARY_ORDER.filter((s) => counts[s]).map((s) => (
              <span key={s} className={`px-2 rounded-full text-2xs font-medium ${TONE_BADGE[STATUS_TONE[s]]}`}>
                {counts[s]} {AUTH_LOCKOUT_STATUS_LABELS[s]}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={lockout.copyReport}
            disabled={!lockout.result?.markdown || lockout.running}
            className="h-8 px-3 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground border border-border text-xs font-medium rounded-[10px] flex items-center gap-1.5"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            Copiar relatório (Jira)
          </button>
        </div>

        {lockout.error && (
          <p role="alert" className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-xl p-3">
            {lockout.error}
          </p>
        )}

        <AuthLockoutChecksList checks={lockout.checks} running={lockout.running} />

        <AuthLockoutActivityLog lines={lockout.activity} requestsCount={lockout.result?.attempts.length} />
      </div>
    </div>
  );
};
