import React from 'react';
import { Settings2 } from 'lucide-react';
import type { InfrEnvField } from '../../../../../shared/infrEnvConfig';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';

const INPUT =
  'w-full bg-background border border-input/80 rounded-[10px] px-2.5 py-2 text-sm text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-warning';

const FieldGrid: React.FC<{
  title: string;
  file: string;
  fields: InfrEnvField[];
  edits: Record<string, string>;
  from: string;
  onEdit: (key: string, value: string) => void;
}> = ({ title, file, fields, edits, from, onEdit }) => (
  <div className="space-y-2">
    <p className="text-2xs font-semibold text-foreground">
      {title} <span className="font-mono font-normal text-muted-foreground">· {file}</span>
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-2xs font-semibold text-muted-foreground block mb-1" title={f.key}>
            {f.label} <span className="font-mono font-normal opacity-70">{f.key}</span>
          </label>
          <input
            type={f.secret ? 'password' : 'text'}
            autoComplete="new-password"
            value={edits[f.key] ?? f.value}
            onChange={(e) => onEdit(f.key, e.target.value)}
            placeholder={f.secret ? (f.hasValue ? `mantém a do ${from}` : 'não definida na origem') : ''}
            className={INPUT}
          />
          {f.hint && <p className="text-2xs text-muted-foreground mt-0.5">{f.hint}</p>}
        </div>
      ))}
    </div>
  </div>
);

/** Configurações do WTA e do WSH do ambiente novo, partindo dos valores da origem. */
export const InfrEnvConfigSection: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const t = s.envTemplate;
  const v = s.form.version || '<versão>';
  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-4">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Settings2 className="w-3.5 h-3.5 text-warning" /> Configurações
        <span className="font-normal text-muted-foreground">
          · valores do ambiente {s.form.from || 'de origem'}; banco, WTA e portas vêm das escolhas acima
        </span>
      </p>
      {!t && <p className="text-2xs text-muted-foreground">Escolha o ambiente de origem para carregar a configuração.</p>}
      {t && !t.success && <p className="text-2xs text-danger">{t.error}</p>}
      {t?.success && (
        <>
          <FieldGrid
            title="WTA"
            file={`linux-winthor/wta.env.${v}`}
            fields={t.wta}
            edits={s.edits.wta}
            from={s.form.from}
            onEdit={(k, val) => s.editEnv('wta', k, val)}
          />
          {s.form.wshJar ? (
            t.hasWsh ? (
              <FieldGrid
                title="WSH"
                file={`wsh-winthor/.env.${v}`}
                fields={t.wsh}
                edits={s.edits.wsh}
                from={s.form.from}
                onEdit={(k, val) => s.editEnv('wsh', k, val)}
              />
            ) : (
              <p className="text-2xs text-warning">O ambiente {s.form.from} não tem wsh-{s.form.from}: o .env do WSH sai só com o que for preenchido aqui.</p>
            )
          ) : (
            <p className="text-2xs text-muted-foreground">Escolha o jar do WSH para configurar o WSH.</p>
          )}
        </>
      )}
    </div>
  );
};
