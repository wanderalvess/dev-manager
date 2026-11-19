import React from 'react';

/**
 * O logo da abertura se montando: o quadro surge girando, as três faces do cubo encaixam (topo, esquerda, direita) e
 * um brilho atravessa o quadro. Mesmo desenho do AppLogo, com cada face num elemento próprio para animar; um halo da
 * cor do tema pulsa uma vez atrás.
 */
export const SplashLogoAssemble: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => (
  <div className={`relative shrink-0 ${className}`}>
    <span aria-hidden="true" className="absolute inset-0 rounded-[25%] bg-primary/40 animate-splash-ring" />
    <div className="relative w-full h-full rounded-[25%] overflow-hidden shadow-2xl shadow-primary/30 animate-splash-tile">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className="w-full h-full text-primary"
        role="img"
        aria-label="Hub Manager"
      >
        <rect width="64" height="64" rx="16" fill="currentColor" />
        <g transform="translate(12 12) scale(.625)" stroke="currentColor" strokeWidth={3} strokeLinejoin="round">
          <path d="M32 5L55.4 18.5L32 32L8.6 18.5Z" fill="#FFFFFF" className="animate-splash-face-top" />
          <path d="M8.6 18.5L32 32V59L8.6 45.5Z" fill="#FFFFFF" fillOpacity="0.72" className="animate-splash-face-left" />
          <path d="M55.4 18.5V45.5L32 59V32Z" fill="#000000" fillOpacity="0.4" className="animate-splash-face-right" />
        </g>
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-splash-shine"
      />
    </div>
  </div>
);
