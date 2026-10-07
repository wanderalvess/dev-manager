import React from 'react';
import { TourStep } from './tourSteps';
import { useOnboardingTourNavigation } from '../../hooks/onboarding/useOnboardingTourNavigation';
import { useOnboardingTourTooltipSize } from '../../hooks/onboarding/useOnboardingTourTooltipSize';
import { useOnboardingTourSpotlight } from '../../hooks/onboarding/useOnboardingTourSpotlight';
import { computeTourTooltipStyle } from '../../utils/onboardingTourUtils';
import { TourSpotlight } from './tour/TourSpotlight';
import { TourTooltip } from './tour/TourTooltip';

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  /** Chave de localStorage marcada ao concluir/pular este tour (cada página usa a sua) */
  storageKey: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, isOpen, onClose, storageKey }) => {
  const { stepIndex, finish, goNext, goPrev } = useOnboardingTourNavigation(steps, isOpen, onClose, storageKey);
  const { tooltipRef, tooltipDimensions } = useOnboardingTourTooltipSize(stepIndex, isOpen);
  const rect = useOnboardingTourSpotlight(steps, stepIndex, isOpen);

  if (!isOpen) return null;

  const step = steps[stepIndex];
  if (!step) return null;

  return (
    <div className="fixed inset-0 z-9999" role="dialog" aria-modal="true">
      {/* Overlay escuro + spotlight */}
      <TourSpotlight rect={rect} />

      <TourTooltip
        key={stepIndex}
        tooltipRef={tooltipRef}
        style={computeTourTooltipStyle(rect, tooltipDimensions)}
        step={step}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        onFinish={finish}
        onNext={goNext}
        onPrev={goPrev}
      />
    </div>
  );
};
