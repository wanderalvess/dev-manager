import React from 'react';
import { TOUR_RING_PADDING } from '../../../utils/onboardingTourUtils';

interface TourSpotlightProps {
  rect: DOMRect | null;
}

/** Overlay escuro com recorte (spotlight) sobre o alvo do passo atual. */
export const TourSpotlight: React.FC<TourSpotlightProps> = ({ rect }) => (
  <div className="fixed inset-0" onClick={(e) => e.stopPropagation()}>
    {rect ? (
      <div
        className="fixed rounded-2xl border-2 border-primary pointer-events-none transition-all duration-200 ease-out shadow-lg"
        style={{
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          top: Math.round(rect.top - TOUR_RING_PADDING),
          left: Math.round(rect.left - TOUR_RING_PADDING),
          width: Math.round(rect.width + TOUR_RING_PADDING * 2),
          height: Math.round(rect.height + TOUR_RING_PADDING * 2)
        }}
      />
    ) : (
      <div className="fixed inset-0 bg-black/70" />
    )}
  </div>
);
