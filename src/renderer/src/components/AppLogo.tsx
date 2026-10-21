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
 * Símbolo do Hub Manager: o hub no centro e as quatro áreas (Infra, Dados, Dev, QA) chegando nele,
 * dentro do quadro do cockpit. Usa a cor `primary` do tema, então acompanha a variante escolhida.
 * Em tamanho pequeno (xs) o anel sai e os traços engrossam para continuar legível.
 * Os ícones do app (public/icon.svg, icon.png, favicon.ico, build/icon.ico) usam o mesmo desenho.
 */
export const AppLogo: React.FC<AppLogoProps> = ({ size = 'sm', className = '', showStatusDot = false, alt = 'Hub Manager' }) => {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;
  const small = size === 'xs';

  const svgContent = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={`${sizeClass} ${className} shrink-0 select-none text-primary`}
      role="img"
      aria-label={alt}
    >
      {small ? (
        <>
          <rect x="5" y="5" width="38" height="38" rx="12" stroke="currentColor" strokeWidth="4" />
          <path d="M24 5v8M24 35v8M5 24h8M35 24h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="24" cy="24" r="7" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="4" y="4" width="40" height="40" rx="12" stroke="currentColor" strokeWidth="2.5" />
          <path d="M24 4v9M24 35v9M4 24h9M35 24h9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="24" r="6" fill="currentColor" />
          <circle cx="24" cy="24" r="10.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45" />
        </>
      )}
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
