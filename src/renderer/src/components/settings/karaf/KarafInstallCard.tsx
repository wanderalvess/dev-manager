import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FolderSearch, Loader2, RefreshCw } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';
import { karafSettingsMismatches, type KarafInstallInfo, type KarafSettingsMismatch } from '../../../../../shared/karafInstall';

interface KarafInstallCardProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const SERVICE_STATE_LABEL: Record<string, string> = {
  RUNNING: 'rodando',
  STOPPED: 'parado',
  START_PENDING: 'iniciando',
  STOP_PENDING: 'parando',
  NOT_INSTALLED: 'não instalado',
  UNKNOWN: 'estado desconhecido'
};

/** Troca só a porta da URL do WTA, mantendo host e caminho. */
const withPort = (url: string | undefined, installed: string) => {
  try {
    const parsed = new URL(url || installed);
    parsed.port = new URL(installed).port;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return installed;
  }
};

function applyMismatch(settings: AppSettings, mismatch: KarafSettingsMismatch): Partial<AppSettings> {
  if (mismatch.field === 'karafSshPort') return { karafSshPort: Number(mismatch.installed) };
  if (mismatch.field === 'jdkPath') return { jdkPath: mismatch.installed };
  return { wtaUrl: withPort(settings.wtaUrl, mismatch.installed) };
}

const Fact: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) =>
  value ? (
    <div className="min-w-0">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-xs text-foreground font-mono break-all">{value}</dd>
    </div>
  ) : null;

/** O que o etc/ da instalação diz (portas, log, JDK, serviço Windows) e o que difere das configurações do app. */
export const KarafInstallCard: React.FC<KarafInstallCardProps> = ({ settings, setSettings }) => {
  const [info, setInfo] = useState<KarafInstallInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const read = window.electronAPI?.getKarafInstallInfo;
    if (!read) return;
    setLoading(true);
    try {
      const response = await read();
      if (response.success) {
        setInfo(response.info);
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError((err as Error)?.message || 'Não foi possível ler a instalação do Karaf.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mismatches = info?.found ? karafSettingsMismatches(info, settings) : [];
  const applyAll = () => setSettings((previous) => mismatches.reduce((next, m) => ({ ...next, ...applyMismatch(next, m) }), previous));

  return (
    <section className="cockpit-panel rounded-xl p-5 space-y-3 shadow-xl border border-border" aria-label="Instalação do Karaf">
      <div className="flex items-start justify-between gap-3 pb-1 border-b border-border/60">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FolderSearch className="w-3.5 h-3.5 text-primary" /> O que a instalação diz
          </h3>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Lido do <code className="font-mono">etc/</code>, do script de início e do serviço Windows da pasta salva. Salve a pasta para ler outra.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="h-8 px-3 text-xs rounded-lg border border-border hover:bg-muted flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Ler de novo
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {info && !info.found && <p className="text-xs text-muted-foreground">{info.note}</p>}

      {info?.found && (
        <>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
            <Fact label="Karaf" value={[info.karafVersion, info.instanceName && `instância ${info.instanceName}`].filter(Boolean).join(' · ')} />
            <Fact label="Porta SSH (client.bat)" value={info.sshPort} />
            <Fact label="Porta HTTP (WTA)" value={info.httpPort} />
            <Fact label="Script de início" value={info.startScript} />
            <Fact label="Log principal" value={info.logFile} />
            <Fact label="JDK do script" value={info.javaHome} />
            <Fact
              label="Serviço Windows"
              value={info.service && `${info.service.name}${info.service.state ? ` (${SERVICE_STATE_LABEL[info.service.state] ?? info.service.state})` : ''}`}
            />
            <Fact label="Repositório Maven local" value={info.mavenLocalRepository} />
          </dl>

          {info.service?.state === 'RUNNING' && (
            <p className="text-xs text-warning flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              O serviço {info.service.name} está rodando esta instalação: o app usa esse Karaf e não inicia outro por cima. Para
              depurar pelo app, pare o serviço antes.
            </p>
          )}

          {mismatches.length > 0 ? (
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-2">
              <ul className="text-xs space-y-1">
                {mismatches.map((m) => (
                  <li key={m.field}>
                    <span className="font-medium text-foreground">{m.label}:</span>{' '}
                    <span className="text-muted-foreground">no app </span>
                    <code className="font-mono">{m.configured}</code>
                    <span className="text-muted-foreground">, na instalação </span>
                    <code className="font-mono">{m.installed}</code>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={applyAll} className="h-8 px-3 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                Usar os valores da instalação
              </button>
            </div>
          ) : (
            <p className="text-xs text-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> As portas e o JDK do app batem com a instalação.
            </p>
          )}
        </>
      )}
    </section>
  );
};
