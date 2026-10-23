import React, { useEffect } from 'react';
import { DatabaseZap, HardDriveDownload } from 'lucide-react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { BACKUPS_TOUR_STEPS, BACKUPS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/backupsTour';
import { BackupPanel } from '../components/database/BackupPanel';
import { useDatabaseConnections } from '../hooks/database/useDatabaseConnections';
import { takePendingBackupConnection } from '../utils/backupsHandoff';

interface BackupsPageProps {
  isActive: boolean;
  settingsVersion?: number;
  onNavigateToDatabase: () => void;
}

// Identidade estável: o hook de conexões usa estes setters nas dependências do carregamento (ver DatabasePage).
const NOOP = (): void => undefined;

/** Backup, restauração, agendamento, arquivos, histórico e webhooks dos bancos cadastrados. */
export const BackupsPage: React.FC<BackupsPageProps> = ({ isActive, settingsVersion, onNavigateToDatabase }) => {
  const tour = usePageTour(BACKUPS_TOUR_STORAGE_KEY);
  const conn = useDatabaseConnections({ settingsVersion, setSql: NOOP, setCustomSnippets: NOOP });
  const { connections, setActiveConnectionId } = conn;

  // Vindo do Studio SQL: abre já na conexão que estava ativa lá.
  useEffect(() => {
    if (!isActive) return;
    const pending = takePendingBackupConnection();
    if (pending && connections.some((c) => c.id === pending)) setActiveConnectionId(pending);
  }, [isActive, connections, setActiveConnectionId]);

  return (
    <div className="h-full flex flex-col p-5 space-y-4 overflow-y-auto max-w-full">
      <div className="cockpit-panel rounded-xl p-4 border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-info/10 border border-info/30 text-info shrink-0">
            <HardDriveDownload className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">Backups de Banco</h1>
            <p className="text-2xs text-muted-foreground">
              Backup e restauração, agendamento, arquivos gerados, histórico e webhooks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" data-tour="backups-connection">
          {connections.length > 0 && (
            <select
              value={conn.activeConnection?.id ?? ''}
              onChange={(e) => setActiveConnectionId(e.target.value)}
              aria-label="Conexão do backup"
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary font-mono max-w-[260px]"
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={tour.open}
            className="px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            title="Rever o tour guiado desta tela"
          >
            Tour
          </button>
        </div>
      </div>

      {conn.settings && connections.length === 0 ? (
        <div className="cockpit-panel rounded-xl p-8 border border-border flex flex-col items-center gap-3 text-center">
          <DatabaseZap className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">Nenhuma conexão de banco cadastrada</p>
          <p className="text-xs text-muted-foreground max-w-md">
            Cadastre uma conexão Oracle, PostgreSQL ou MySQL na tela Banco de Dados para poder fazer backups.
          </p>
          <button
            type="button"
            onClick={onNavigateToDatabase}
            className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold transition cursor-pointer"
          >
            Ir para Banco de Dados
          </button>
        </div>
      ) : (
        <BackupPanel
          isActive={isActive}
          activeConnection={conn.activeConnection}
          connections={connections}
          settings={conn.settings}
          onSettingsUpdate={(updater) => conn.setSettings(updater)}
        />
      )}

      <OnboardingTour
        steps={BACKUPS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={BACKUPS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
