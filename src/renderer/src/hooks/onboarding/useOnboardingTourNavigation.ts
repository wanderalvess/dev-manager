import { useCallback, useEffect, useRef, useState } from 'react';
import type { TourStep } from '../../components/onboarding/tourSteps';
import { announceTourFinished } from '../../components/onboarding/tourCoordinator';
import { findValidTourIndex, markTourStorage } from '../../utils/onboardingTourUtils';

export function useOnboardingTourNavigation(
  steps: TourStep[],
  isOpen: boolean,
  onClose: () => void,
  storageKey: string
) {
  const [stepIndex, setStepIndex] = useState(0);
  const directionRef = useRef<1 | -1>(1);

  const finish = useCallback(() => {
    markTourStorage(storageKey);
    announceTourFinished();
    onClose();
  }, [onClose, storageKey]);

  const goNext = useCallback(() => {
    directionRef.current = 1;
    setStepIndex((i) => i + 1);
  }, []);

  const goPrev = useCallback(() => {
    directionRef.current = -1;
    setStepIndex((i) => i - 1);
  }, []);

  // Reseta ao abrir
  useEffect(() => {
    if (isOpen) {
      directionRef.current = 1;
      setStepIndex(0);
    }
  }, [isOpen]);

  // Resolve passo atual pulando alvos ausentes na direção da navegação
  useEffect(() => {
    if (!isOpen) return;
    if (stepIndex < 0 || stepIndex >= steps.length) {
      finish();
      return;
    }
    const dir = directionRef.current;
    const valid = findValidTourIndex(steps, stepIndex, dir);
    if (valid === null) {
      finish();
      return;
    }
    if (valid !== stepIndex) setStepIndex(valid);
  }, [stepIndex, isOpen, steps, finish]);

  // Atalhos de teclado
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, finish, goNext, goPrev]);

  return { stepIndex, finish, goNext, goPrev };
}
