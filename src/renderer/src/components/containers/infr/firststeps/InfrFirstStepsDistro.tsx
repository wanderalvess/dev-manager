import React, { useEffect, useState } from 'react';
import { ExternalLink, FolderOpen, Loader2 } from 'lucide-react';
import { INFR_DISTRO_TAR, INFR_TEAM_DRIVE_URL, wslImportCommand } from '../../../../../../shared/infrFirstStepsCommands';
import type { InfrFirstStepsState } from '../../../../hooks/containers/useInfrFirstSteps';
import { InfrCommandLine } from '../InfrCommandLine';
import { FS_BTN, FS_INPUT, FS_PRIMARY } from './InfrFirstStepRow';

function elapsed(since: number, now: number): string {
  const s = Math.max(0, Math.round((now - since) / 1000));
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

/** Item 2: baixar o .tar do Drive e importar a distro pelo próprio Hub (wsl --import). */
export const InfrFirstStepsDistro: React.FC<{ f: InfrFirstStepsState }> = ({ f }) => {
  const [now, setNow] = useState(Date.now());
  const importing = f.importStartedAt !== null;
  useEffect(() => {
    if (!importing) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [importing]);

  const nameOk = !f.tar.path || f.tar.path.toLowerCase().endsWith(INFR_DISTRO_TAR.toLowerCase());
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div className="space-y-3">
        <button type="button" onClick={() => f.openUrl(INFR_TEAM_DRIVE_URL)} className={FS_BTN}>
          <ExternalLink className="w-3.5 h-3.5" /> Baixar o {INFR_DISTRO_TAR} do Drive do time
        </button>
        <label className="block text-xs font-semibold text-foreground">
          Arquivo da distro (.tar)
          <span className="mt-1.5 flex gap-2">
            <input value={f.tar.path} onChange={(e) => f.setTar({ ...f.tar, path: e.target.value })} disabled={importing} placeholder={`C:\\Users\\voce\\Downloads\\${INFR_DISTRO_TAR}`} className={FS_INPUT} />
            <button type="button" onClick={f.pickTar} disabled={importing} className={FS_BTN}>
              <FolderOpen className="w-3.5 h-3.5" /> Escolher
            </button>
          </span>
        </label>
        {!nameOk && <p className="text-2xs text-warning">O nome não é o do manual ({INFR_DISTRO_TAR}). Confira se é a distro certa.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-foreground">
            Nome da distro
            <input value={f.tar.name} onChange={(e) => f.setTar({ ...f.tar, name: e.target.value })} disabled={importing} className={`${FS_INPUT} mt-1.5`} />
          </label>
          <label className="block text-xs font-semibold text-foreground">
            Pasta do disco virtual
            <input value={f.tar.dir} onChange={(e) => f.setTar({ ...f.tar, dir: e.target.value })} disabled={importing} className={`${FS_INPUT} mt-1.5`} />
          </label>
        </div>
        <p className="text-2xs text-muted-foreground">O Hub procura a distro com &quot;winthor&quot; no nome. Reserve uns 40 GB no disco para banco e imagens.</p>
        <button type="button" onClick={f.importDistro} disabled={importing || !f.tar.path.trim()} className={FS_PRIMARY}>
          {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {importing ? 'Importando...' : 'Importar a distro'}
        </button>
      </div>
      <div className="space-y-3">
        {importing && f.importStartedAt !== null && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Andamento</p>
            <div className="h-2 rounded-full bg-muted overflow-hidden relative">
              <div className="absolute inset-y-0 w-1/4 rounded-full bg-primary animate-pulse left-1/3" />
            </div>
            <p className="text-2xs text-foreground/80">
              Importando há {elapsed(f.importStartedAt, now)}. Costuma levar de 5 a 15 min. O wsl --import não informa porcentagem; não feche o Hub.
            </p>
          </div>
        )}
        <InfrCommandLine block label="O mesmo pelo PowerShell" command={wslImportCommand(f.tar.path || INFR_DISTRO_TAR, f.tar.name, f.tar.dir)} />
      </div>
    </div>
  );
};
