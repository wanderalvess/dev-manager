import { useCallback, useEffect, useState } from 'react';

export function useAppShellOnboarding(setActiveTab: (tab: string) => void) {
  const [isSplashOpen, setIsSplashOpen] = useState(false);
  const [isNewUser] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isPageToursPromptOpen, setIsPageToursPromptOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');
  const [appVersion, setAppVersion] = useState('1.68.1');

  useEffect(() => {
    window.electronAPI?.getAppInfo?.().then((info) => {
      if (info?.appVersion) setAppVersion(info.appVersion);
    }).catch(() => {});
  }, []);

  const handleOpenWhatsNew = useCallback(async () => {
    try {
      const text = await window.electronAPI?.getChangelog?.();
      setChangelogContent(text || `# v${appVersion}\n\nHub Manager Cockpit.`);
    } catch {
      setChangelogContent(`# v${appVersion}`);
    }
    setIsWhatsNewOpen(true);
  }, [appVersion]);

  return {
    isSplashOpen,
    isNewUser,
    isWelcomeOpen,
    isTourOpen,
    isPageToursPromptOpen,
    setIsPageToursPromptOpen,
    isWhatsNewOpen,
    setIsWhatsNewOpen,
    changelogContent,
    appVersion,
    handleSplashStartOnboarding: () => { setIsSplashOpen(false); setIsWelcomeOpen(true); },
    handleSplashExplore: () => setIsSplashOpen(false),
    handleSplashEnter: () => setIsSplashOpen(false),
    handleSplashWhatsNew: () => { setIsSplashOpen(false); void handleOpenWhatsNew(); },
    handleWelcomeOpenSettings: () => { setIsWelcomeOpen(false); setActiveTab('settings'); },
    handleWelcomeOpenInfrFirstSteps: () => { setIsWelcomeOpen(false); setActiveTab('winthor'); },
    handleFinishWelcome: (wantsTour: boolean) => { setIsWelcomeOpen(false); if (wantsTour) setIsTourOpen(true); },
    handleCloseTour: () => setIsTourOpen(false),
    handleRestartTour: () => setIsTourOpen(true),
    handleResetPageTours: () => setIsPageToursPromptOpen(true),
    handleOpenWhatsNew
  };
}

export function useAppShellNotifications() {
  useEffect(() => {
    const unsub = window.electronAPI?.onBackupScheduleResult?.(() => {});
    return () => unsub?.();
  }, []);
}
