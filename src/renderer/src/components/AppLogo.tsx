import React from 'react';

export interface AppLogoProps {
  /** Tamanho predefinido do ícone */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Classes CSS extras para personalização */
  className?: string;
  /** Exibe indicador de status operacional ao vivo (LED verde pulsante) */
  showStatusDot?: boolean;
  /** Título acessível */
  alt?: string;
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5',
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-16 h-16 sm:w-20 sm:h-20',
  xl: 'w-24 h-24'
};

/**
 * Símbolo do Hub Manager: um bundle (cubo isométrico em três tons) sobre o quadro arredondado.
 * O quadro usa a cor `primary` do tema, então acompanha a variante escolhida.
 * Em tamanho pequeno (xs) o cubo cresce e as juntas engrossam para continuar legível.
 * Os ícones do app (public/icon.svg, icon.png, favicon.ico, build/icon.ico) usam o mesmo desenho.
 */
export const AppLogo: React.FC<AppLogoProps> = ({ size = 'sm', className = '', showStatusDot = false, alt = 'Hub Manager' }) => {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;
  const small = size === 'xs';

  const svgContent = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={`${sizeClass} ${className} shrink-0 select-none text-primary`}
      role="img"
      aria-label={alt}
    >
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <g
        transform={small ? 'translate(10 10) scale(.68)' : 'translate(12 12) scale(.625)'}
        stroke="currentColor"
        strokeWidth={small ? 5 : 3}
        strokeLinejoin="round"
      >
        <path d="M32 5L55.4 18.5L32 32L8.6 18.5Z" fill="#FFFFFF" />
        <path d="M8.6 18.5L32 32V59L8.6 45.5Z" fill="#FFFFFF" fillOpacity="0.72" />
        <path d="M55.4 18.5V45.5L32 59V32Z" fill="#000000" fillOpacity="0.4" />
      </g>
    </svg>
  );

  if (!showStatusDot) {
    return svgContent;
  }

  return (
    <div className="relative inline-flex shrink-0">
      {svgContent}
      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success border-2 border-card rounded-full flex items-center justify-center">
        <span className="w-1 h-1 bg-white rounded-full animate-ping" />
      </div>
    </div>
  );
};
