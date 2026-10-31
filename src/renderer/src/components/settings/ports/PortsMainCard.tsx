import React from 'react';
import { AppSettings } from '../../../../../shared/types';
import { SECTION_TITLE_CLASS } from '../../ui/PageHeader';
import { normalizeWebPath, parsePortInput, webPathToInput } from '../../../utils/portsTabUtils';

interface PortsMainCardProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onGoToKaraf: () => void;
  onOpenApm: () => void;
}

const INPUT = 'w-full h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring';

/** Porta que é editada em outra tela: aparece aqui só para consulta, com o atalho para quem é dono dela. */
const ReadOnlyPort: React.FC<{ label: string; value: number; hint: string; actionLabel: string; onAction: () => void }> = ({
  label,
  value,
  hint,
  actionLabel,
  onAction
}) => (
  <div className="space-y-1.5 min-w-0">
    <span className="text-[13px] font-semibold text-foreground">{label}</span>
    <div className="h-9 rounded-lg border border-dashed border-border px-3 flex items-center justify-between gap-2">
      <span className="text-sm font-mono text-foreground">{value}</span>
      <button type="button" onClick={onAction} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
        {actionLabel}
      </button>
    </div>
    <p className="text-xs text-muted-foreground">{hint}</p>
  </div>
);

/** Portas que o próprio Hub usa. Cada uma tem um dono: SSH e debug são do Karaf, o receptor OTLP é do APM. */
export const PortsMainCard: React.FC<PortsMainCardProps> = ({ settings, setSettings, onGoToKaraf, onOpenApm }) => (
  <section aria-labelledby="ports-main" className="rounded-xl border border-border bg-card p-5 space-y-4">
    <div>
      <h3 id="ports-main" className={SECTION_TITLE_CLASS}>
        Portas do Hub
      </h3>
      <p className="text-xs text-muted-foreground">Cada porta é editada num lugar só. As do Karaf e do APM aparecem aqui para consulta.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="space-y-1.5 min-w-0">
        <label htmlFor="ports-web-port" className="text-[13px] font-semibold text-foreground">
          Portal web local
        </label>
        <input
          id="ports-web-port"
          type="number"
          value={settings.webPort ?? 8889}
          onChange={(e) => setSettings({ ...settings, webPort: parsePortInput(e.target.value) })}
          className={INPUT}
          placeholder="8889"
        />
        <input
          aria-label="Caminho do Portal Web (path)"
          type="text"
          value={webPathToInput(settings.webPath)}
          onChange={(e) => setSettings({ ...settings, webPath: normalizeWebPath(e.target.value) })}
          className={INPUT}
          placeholder="web"
        />
        <p className="text-xs text-muted-foreground font-mono break-all">
          localhost:{settings.webPort || 8889}
          {settings.webPath || ''}
        </p>
      </div>
      <ReadOnlyPort
        label="Receptor APM (OTLP)"
        value={settings.apmReceiverPort ?? 4318}
        hint="Recebe a telemetria do Karaf. Trocar reinicia o receptor."
        actionLabel="Alterar no APM"
        onAction={onOpenApm}
      />
      <ReadOnlyPort
        label="Karaf SSH"
        value={settings.karafSshPort ?? 8101}
        hint="Usada pelo client.bat e pelo deploy de bundles."
        actionLabel="Alterar em Karaf"
        onAction={onGoToKaraf}
      />
      <ReadOnlyPort
        label="Debug da JVM"
        value={settings.karafDebugPort ?? 5005}
        hint="Onde a IDE conecta o debug remoto."
        actionLabel="Alterar em Karaf"
        onAction={onGoToKaraf}
      />
    </div>
  </section>
);
