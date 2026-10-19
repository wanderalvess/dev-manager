import React, { Suspense, lazy } from 'react';
import { ToastHost } from '../ToastHost';
import { ConfirmHost } from '../ui/ConfirmHost';
import { UpdateNotifier } from './UpdateNotifier';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import { WelcomeIntro } from '../onboarding/WelcomeIntro';
import { PageToursPromptModal } from '../onboarding/PageToursPromptModal';
import { TOUR_STORAGE_KEY, type TourStep } from '../onboarding/tourSteps';

// Modal de novidades e histórico de versões do changelog
const WhatsNewModal = lazy(() => import('../WhatsNewModal').then((m) => ({ default: m.WhatsNewModal })));

export interface AppGlobalModalsProps {
  isWelcomeOpen: boolean;
  isTourOpen: boolean;
  /** Passos do tour global já sem os grupos do Header que sumiram (módulos desligados). */
  tourSteps: TourStep[];
  isPageToursPromptOpen: boolean;
  isWhatsNewOpen: boolean;
  changelogContent: string;
  appVersion: string;
  onFinishWelcome: () => void;
  onCloseTour: () => void;
  onClosePageToursPrompt: () => void;
  onCloseWhatsNew: () => void;
}

export const AppGlobalModals: React.FC<AppGlobalModalsProps> = ({
  isWelcomeOpen,
  isTourOpen,
  tourSteps,
  isPageToursPromptOpen,
  isWhatsNewOpen,
  changelogContent,
  appVersion,
  onFinishWelcome,
  onCloseTour,
  onClosePageToursPrompt,
  onCloseWhatsNew
}) => (
  <>
    <ToastHost />
    <ConfirmHost />
    <UpdateNotifier />

    <WelcomeIntro isOpen={isWelcomeOpen} onFinish={onFinishWelcome} />

    <OnboardingTour
      steps={tourSteps}
      isOpen={isTourOpen && !isWelcomeOpen}
      onClose={onCloseTour}
      storageKey={TOUR_STORAGE_KEY}
    />

    <PageToursPromptModal isOpen={isPageToursPromptOpen} onSelectChoice={onClosePageToursPrompt} />

    {isWhatsNewOpen && changelogContent && (
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
