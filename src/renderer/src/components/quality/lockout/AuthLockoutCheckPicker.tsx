import React from 'react';
import { Clock } from 'lucide-react';
import { AUTH_LOCKOUT_CHECKS, AUTH_LOCKOUT_CHECK_IDS } from '../../../../../shared/authLockoutCatalog';
import type { AuthLockoutCheckId } from '../../../../../shared/authLockoutTypes';
import { SLOW_CHECK_IDS } from '../../../utils/authLockoutView';
import { SectionTitle } from './lockoutFormFields';

interface AuthLockoutCheckPickerProps {
  selected: AuthLockoutCheckId[];
  onChange: (checks: AuthLockoutCheckId[]) => void;
}

const PRESET_CLASS = 'text-2xs font-medium text-primary hover:underline';

/** Quais das 12 checagens rodar; as lentas (duração e janela) esperam minutos. */
export const AuthLockoutCheckPicker: React.FC<AuthLockoutCheckPickerProps> = ({ selected, onChange }) => {
  const toggle = (id: AuthLockoutCheckId) =>
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : AUTH_LOCKOUT_CHECK_IDS.filter((c) => c === id || selected.includes(c)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>Checagens ({selected.length}/12)</SectionTitle>
        <div className="flex gap-3">
          <button type="button" className={PRESET_CLASS} onClick={() => onChange([...AUTH_LOCKOUT_CHECK_IDS])}>
            Todas
          </button>
          <button type="button" className={PRESET_CLASS} onClick={() => onChange(AUTH_LOCKOUT_CHECK_IDS.filter((id) => !SLOW_CHECK_IDS.includes(id)))}>
            Só as rápidas
          </button>
        </div>
      </div>
      <ul className="space-y-1">
        {AUTH_LOCKOUT_CHECKS.map((check) => (
          <li key={check.id}>
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer" title={`${check.attempt} — ${check.expectation}`}>
              <input type="checkbox" checked={selected.includes(check.id)} onChange={() => toggle(check.id)} />
              <span className="flex-1">{check.title}</span>
              {check.slow && <Clock className="w-3 h-3 text-muted-foreground" aria-label="Espera minutos" />}
              {check.needsUserB && <span className="text-2xs font-mono text-muted-foreground">A+B</span>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};
