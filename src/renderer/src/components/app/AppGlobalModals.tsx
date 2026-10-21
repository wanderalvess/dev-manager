import React, { Suspense, lazy } from 'react';
import { ToastHost } from '../ToastHost';
import { ConfirmHost } from '../ui/ConfirmHost';
import { UpdateNotifier } from './UpdateNotifier';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import { SplashScreen } from '../onboarding/SplashScreen';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { PageToursPromptModal } from '../onboarding/PageToursPromptModal';
import { TOUR_STORAGE_KEY, type TourStep } from '../onboarding/tourSteps';

// Modal de novidades e histórico de versões do changelog
const WhatsNewModal = lazy(() => import('../WhatsNewModal').then((m) => ({ default: m.WhatsNewModal })));

export interface AppGlobalModalsProps {
  isSplashOpen: boolean;
  isNewUser: boolean;
  isWelcomeOpen: boolean;
  isTourOpen: boolean;
  /** Passos do tour global já sem os grupos do Header que sumiram (módulos desligados). */
  tourSteps: TourStep[];
  isPageToursPromptOpen: boolean;
  isWhatsNewOpen: boolean;
  changelogContent: string;
  appVersion: string;
  onSplashStartOnboarding: () => void;
  onSplashExplore: () => void;
  onSplashEnter: () => void;
  onSplashWhatsNew: () => void;
  onFinishWelcome: (wantsTour: boolean) => void;
  onSettingsSaved: () => void;
  onOpenSettings: () => void;
  onCloseTour: () => void;
  onClosePageToursPrompt: () => void;
  onCloseWhatsNew: () => void;
}

export const AppGlobalModals: React.FC<AppGlobalModalsProps> = ({
  isSplashOpen,
  isNewUser,
  isWelcomeOpen,
  isTourOpen,
  tourSteps,
  isPageToursPromptOpen,
  isWhatsNewOpen,
  changelogContent,
  appVersion,
  onSplashStartOnboarding,
  onSplashExplore,
  onSplashEnter,
  onSplashWhatsNew,
  onFinishWelcome,
  onSettingsSaved,
  onOpenSettings,
  onCloseTour,
  onClosePageToursPrompt,
  onCloseWhatsNew
}) => (
  <>
    <ToastHost />
    <ConfirmHost />
    <UpdateNotifier />

    <SplashScreen
      isOpen={isSplashOpen}
      isNewUser={isNewUser}
      appVersion={appVersion}
      onStartOnboarding={onSplashStartOnboarding}
      onExplore={onSplashExplore}
      onEnter={onSplashEnter}
      onWhatsNew={onSplashWhatsNew}
    />

    <OnboardingWizard isOpen={isWelcomeOpen} onFinish={onFinishWelcome} onSettingsSaved={onSettingsSaved} onOpenSettings={onOpenSettings} />

    <OnboardingTour
      steps={tourSteps}
      isOpen={isTourOpen && !isWelcomeOpen && !isSplashOpen}
      onClose={onCloseTour}
      storageKey={TOUR_STORAGE_KEY}
    />

    <PageToursPromptModal isOpen={isPageToursPromptOpen} onSelectChoice={onClosePageToursPrompt} />

    {isWhatsNewOpen && !isSplashOpen && changelogContent && (
      <Suspense fallback={null}>
        <WhatsNewModal
          isOpen={isWhatsNewOpen}
          onClose={onCloseWhatsNew}
          changelogContent={changelogContent}
          currentAppVersion={appVersion}
        />
      </Suspense>
    )}
  </>
);
