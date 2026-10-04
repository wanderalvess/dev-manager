import React, { useState } from 'react';
import { CcwRoutineModal } from '../components/CcwRoutineModal';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { ROUTINES_TOUR_STEPS, ROUTINES_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/routinesTour';
import { shouldShowKarafWarningBanner } from '../utils/routineLaunchUiUtils';
import { CcwInitialTab, buildModuleOptions, filterRoutines, splitFavorites } from '../utils/routinesPageUtils';
import { useKarafStatus } from '../hooks/routines/useKarafStatus';
import { useRoutinesCatalog } from '../hooks/routines/useRoutinesCatalog';
import { useMappedPrograms } from '../hooks/routines/useMappedPrograms';
import { useRoutineLaunch } from '../hooks/routines/useRoutineLaunch';
import { RoutinesHeader } from '../components/routines/RoutinesHeader';
import { KarafWarningBanner, AppPathWarning } from '../components/routines/RoutinesAlerts';
import { LaunchFeedbackBanner } from '../components/routines/LaunchFeedbackBanner';
import { MappedProgramsPanel } from '../components/routines/MappedProgramsPanel';
import { RoutinesCatalogList } from '../components/routines/RoutinesCatalogList';

interface RoutinesPageProps {
  onNavigateToSettings?: () => void;
  onNavigateToEnv?: () => void;
  settingsVersion?: number;
}

export const RoutinesPage: React.FC<RoutinesPageProps> = ({
  onNavigateToSettings,
  onNavigateToEnv,
  settingsVersion
}) => {
  const tour = usePageTour(ROUTINES_TOUR_STORAGE_KEY);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('TODOS');

  // Modal de Download & Atualização via Central de Controle (CCW)
  const [isCcwModalOpen, setIsCcwModalOpen] = useState<boolean>(false);
  const [ccwInitialRoutine, setCcwInitialRoutine] = useState<string>('');
  const [ccwInitialTab, setCcwInitialTab] = useState<CcwInitialTab>('download');

  const handleOpenCcwModal = (routineName?: string, tab: CcwInitialTab = 'download') => {
    setCcwInitialRoutine(routineName || '');
    setCcwInitialTab(tab);
    setIsCcwModalOpen(true);
  };

  const {
    karafStatus,
    setKarafStatus,
    isCheckingKaraf,
    isStartingKaraf,
    checkKaraf,
    handleStartEmbeddedKaraf
  } = useKarafStatus();
  const { routines, isLoading, loadRoutines, handleToggleFavorite } = useRoutinesCatalog(checkKaraf);
  const {
    mappedPrograms,
    runningMappedId,
    isAddingProgram,
    appPath,
    winthorStartActive,
    handleAddMappedProgram,
    handleRenameMappedProgram,
    handleRenameMappedProgramBlur,
    handleRemoveMappedProgram,
    handleLaunchMappedProgram
  } = useMappedPrograms(settingsVersion, loadRoutines);
  const { runningId, launchFeedback, setLaunchFeedback, handleLaunchRoutine } = useRoutineLaunch(setKarafStatus);

  const modules = buildModuleOptions(routines);
  const filteredRoutines = filterRoutines(routines, searchTerm, selectedModule);
  const { favoriteRoutines, otherRoutines } = splitFavorites(filteredRoutines);

  return (
    <div className="h-full flex flex-col p-4 md:p-5 space-y-3.5 overflow-hidden max-w-full select-none">
      <RoutinesHeader
        routinesCount={routines.length}
        filteredCount={filteredRoutines.length}
        mappedProgramsCount={mappedPrograms.length}
        appPath={appPath}
        winthorStartActive={winthorStartActive}
        karafStatus={karafStatus}
        isCheckingKaraf={isCheckingKaraf}
        isLoading={isLoading}
        searchTerm={searchTerm}
        selectedModule={selectedModule}
        modules={modules}
        onSearchChange={setSearchTerm}
        onModuleChange={setSelectedModule}
        onOpenCcwModal={handleOpenCcwModal}
        onRefresh={loadRoutines}
        onOpenTour={tour.open}
      />

      {shouldShowKarafWarningBanner(karafStatus, winthorStartActive) && (
        <KarafWarningBanner
          karafStatus={karafStatus}
          isStartingKaraf={isStartingKaraf}
          isCheckingKaraf={isCheckingKaraf}
          onNavigateToEnv={onNavigateToEnv}
          onStartKaraf={handleStartEmbeddedKaraf}
          onCheckKaraf={checkKaraf}
        />
      )}

      {launchFeedback && (
        <LaunchFeedbackBanner
          feedback={launchFeedback}
          isStartingKaraf={isStartingKaraf}
          onNavigateToEnv={onNavigateToEnv}
          onNavigateToSettings={onNavigateToSettings}
          onStartKaraf={handleStartEmbeddedKaraf}
          onLaunchDirect={() => handleLaunchRoutine(launchFeedback.routine, true)}
          onClose={() => setLaunchFeedback(null)}
        />
      )}

      {!appPath && <AppPathWarning onNavigateToSettings={onNavigateToSettings} />}

      <MappedProgramsPanel
        mappedPrograms={mappedPrograms}
        runningMappedId={runningMappedId}
        isAddingProgram={isAddingProgram}
        onAdd={handleAddMappedProgram}
        onRename={handleRenameMappedProgram}
        onRenameBlur={handleRenameMappedProgramBlur}
        onLaunch={handleLaunchMappedProgram}
        onRemove={handleRemoveMappedProgram}
      />

      {/* Área rolável: catálogo de rotinas (favoritas + todas) rola independente do cabeçalho */}
      <RoutinesCatalogList
        routinesCount={routines.length}
        favoriteRoutines={favoriteRoutines}
        otherRoutines={otherRoutines}
        runningId={runningId}
        onNavigateToSettings={onNavigateToSettings}
        onToggleFavorite={handleToggleFavorite}
        onLaunch={(routine) => handleLaunchRoutine(routine)}
        onOpenCcwModal={handleOpenCcwModal}
      />

      <CcwRoutineModal
        isOpen={isCcwModalOpen}
        onClose={() => setIsCcwModalOpen(false)}
        onSuccess={loadRoutines}
        initialRoutineName={ccwInitialRoutine}
        initialTab={ccwInitialTab}
        appPath={appPath}
      />

      <OnboardingTour
        steps={ROUTINES_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={ROUTINES_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
