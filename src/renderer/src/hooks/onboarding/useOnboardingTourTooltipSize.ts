import { useEffect, useRef, useState } from 'react';
import { TOUR_TOOLTIP_HEIGHT, TOUR_TOOLTIP_WIDTH } from '../../utils/onboardingTourUtils';

/** Mede as dimensões reais do tooltip renderizado para posicionamento preciso. */
export function useOnboardingTourTooltipSize(stepIndex: number, isOpen: boolean) {
  const [tooltipDimensions, setTooltipDimensions] = useState<{ width: number; height: number }>({
    width: TOUR_TOOLTIP_WIDTH,
    height: TOUR_TOOLTIP_HEIGHT
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tooltipRef.current) {
      const { offsetWidth, offsetHeight } = tooltipRef.current;
      if (offsetWidth > 0 && offsetHeight > 0) {
        setTooltipDimensions({ width: offsetWidth, height: offsetHeight });
      }
    }
  }, [stepIndex, isOpen]);

  return { tooltipRef, tooltipDimensions };
}
