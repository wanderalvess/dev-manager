import React, { useEffect } from 'react';
import { DatabaseZap } from 'lucide-react';
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
    <div className="h-full flex flex-col p-5 md:p-7 space-y-5 overflow-y-auto max-w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-foreground">Backups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Backup e restauração dos bancos, com agendamento, arquivos gerados, histórico e webhooks.
          </p>
        </div>

        <div className="flex items-center gap-2" data-tour="backups-connection">
          {connections.length > 0 && (
            <select
              value={conn.activeConnection?.id ?? ''}
              onChange={(e) => setActiveConnectionId(e.target.value)}
              aria-label="Conexão do backup"
              className="h-10 bg-card border border-input rounded-[10px] px-3 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring max-w-[280px]"
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
            className="h-10 px-3 rounded-[10px] text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            title="Rever o tour guiado desta tela"
          >
            Tour
          </button>
        </div>
      </div>

      {conn.settings && connections.length === 0 ? (
        <div className="bg-card rounded-[14px] p-12 border border-border shadow-xs flex flex-col items-center gap-3 text-center">
          <DatabaseZap className="w-8 h-8 text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">Cadastre uma conexão de banco primeiro</p>
          <p className="text-[13px] text-muted-foreground max-w-md">
            Cadastre uma conexão Oracle, PostgreSQL ou MySQL na tela Banco de Dados para poder fazer backups.
          </p>
          <button
            type="button"
            onClick={onNavigateToDatabase}
            className="h-10 px-4 rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition cursor-pointer"
          >
            Ir para Banco de dados
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
