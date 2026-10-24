import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { DelphiInstallation, DelphiProject } from '../../../../shared/types';
import type { DelphiFormState } from '../../utils/delphiBuildView';

const INPUT_CLASS =
  'w-full bg-card border border-input/80 rounded-[10px] px-2.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring font-mono disabled:opacity-60';

interface DelphiBuildFormProps {
  form: DelphiFormState;
  installations: DelphiInstallation[];
  projects: DelphiProject[];
  disabled: boolean;
  onChange: (patch: Partial<DelphiFormState>) => void;
}

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="flex flex-col gap-1 min-w-0">
    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="text-2xs text-muted-foreground">{hint}</span>}
  </label>
);

export const DelphiBuildForm: React.FC<DelphiBuildFormProps> = ({ form, installations, projects, disabled, onChange }) => {
  const pickPublishDir = async () => {
    const dir = await window.electronAPI.selectDirectory(form.publishDir || undefined);
    if (dir) onChange({ publishDir: dir });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Versão do Delphi" hint={installations.length === 0 ? 'Nenhuma instalação detectada: informe o caminho do rsvars.bat.' : undefined}>
        {installations.length > 0 && (
          <select
            className={INPUT_CLASS}
            disabled={disabled}
            value={installations.some((i) => i.rsvarsPath === form.rsvarsPath) ? form.rsvarsPath : ''}
            onChange={(e) => e.target.value && onChange({ rsvarsPath: e.target.value })}
          >
            <option value="">Personalizado…</option>
            {installations.map((i) => (
              <option key={i.rsvarsPath} value={i.rsvarsPath}>
                {i.label}
              </option>
            ))}
          </select>
        )}
        <input
          className={INPUT_CLASS}
          disabled={disabled}
          placeholder="…\Embarcadero\Studio\23.0\bin\rsvars.bat"
          value={form.rsvarsPath}
          onChange={(e) => onChange({ rsvarsPath: e.target.value })}
        />
      </Field>

      <Field label="Projeto (.dproj)" hint={projects.length === 0 ? 'Nenhum .dproj achado na pasta de projetos das Configurações.' : undefined}>
        {projects.length > 0 && (
          <select
            className={INPUT_CLASS}
            disabled={disabled}
            value={projects.some((p) => p.dprojPath === form.dprojPath) ? form.dprojPath : ''}
            onChange={(e) => e.target.value && onChange({ dprojPath: e.target.value })}
          >
            <option value="">Personalizado…</option>
            {projects.map((p) => (
              <option key={p.dprojPath} value={p.dprojPath}>
                {p.name} — {p.relativeDir}
              </option>
            ))}
          </select>
        )}
        <input
          className={INPUT_CLASS}
          disabled={disabled}
          placeholder="C:\…\Rotina.dproj"
          value={form.dprojPath}
          onChange={(e) => onChange({ dprojPath: e.target.value })}
        />
      </Field>

      <Field label="Configuração">
        <input className={INPUT_CLASS} disabled={disabled} list="delphi-configs" value={form.config} onChange={(e) => onChange({ config: e.target.value })} />
        <datalist id="delphi-configs">
          <option value="Debug" />
          <option value="Release" />
        </datalist>
      </Field>

      <Field label="Plataforma">
        <select className={INPUT_CLASS} disabled={disabled} value={form.platform} onChange={(e) => onChange({ platform: e.target.value })}>
          <option value="Win32">Win32</option>
          <option value="Win64">Win64</option>
        </select>
      </Field>

      <div className="md:col-span-2">
        <Field label="Pasta de publicação (opcional)" hint="O .exe novo é copiado para cá e a versão anterior fica como .bak.">
          <div className="flex gap-2">
            <input
              className={INPUT_CLASS}
              disabled={disabled}
              placeholder="Ex.: pasta Prod das rotinas"
              value={form.publishDir}
              onChange={(e) => onChange({ publishDir: e.target.value })}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={pickPublishDir}
              className="px-2.5 bg-card hover:bg-muted border border-border/80 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              title="Escolher pasta" aria-label="Escolher pasta de publicação"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        </Field>
      </div>

      <div className="md:col-span-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" disabled={disabled} checked={form.killRunning} onChange={(e) => onChange({ killRunning: e.target.checked })} />
          Encerrar o .exe em execução antes de compilar
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" disabled={disabled} checked={form.launch} onChange={(e) => onChange({ launch: e.target.checked })} />
          Abrir o executável ao final
        </label>
      </div>
    </div>
  );
};
