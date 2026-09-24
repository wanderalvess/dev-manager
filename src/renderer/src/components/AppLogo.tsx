import React, { useId } from 'react';

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

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'sm',
  className = '',
  showStatusDot = false,
  alt = 'Dev Manager'
}) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');

  const bgGradId = `bgGrad_${uid}`;
  const borderGradId = `borderGrad_${uid}`;
  const fuselageGradId = `fuselageGrad_${uid}`;
  const wingGradId = `wingGrad_${uid}`;
  const hudVisorGradId = `hudVisorGrad_${uid}`;
  const mainPlasmaGradId = `mainPlasmaGrad_${uid}`;
  const sidePlasmaGradId = `sidePlasmaGrad_${uid}`;
  const sunGlowGradId = `sunGlowGrad_${uid}`;
  const reflGlowGradId = `reflGlowGrad_${uid}`;
  const squircleClipId = `squircleClip_${uid}`;
  const neonGlowId = `neonGlow_${uid}`;
  const plasmaGlowId = `plasmaGlow_${uid}`;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

  const svgContent = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={`${sizeClass} ${className} shrink-0 select-none`}
      role="img"
      aria-label={alt}
    >
      <defs>
        {/* Gradiente de Fundo (dusk indigo, aberto para a luz) */}
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="55%" stopColor="#161533" />
          <stop offset="100%" stopColor="#0B1024" />
        </linearGradient>

        {/* Gradiente da Borda Neon Ciano */}
        <linearGradient id={borderGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        {/* Gradiente Fuselagem Foguete (Metal Iluminado, sem cair no preto) */}
        <linearGradient id={fuselageGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="20%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="80%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        <linearGradient id={wingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="40%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1E3A5F" />
        </linearGradient>

        {/* Brilho da fonte de luz distante */}
        <radialGradient id={sunGlowGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
        </radialGradient>

        {/* Brilho do reflexo na base */}
        <radialGradient id={reflGlowGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
        </radialGradient>

        {/* Gradiente do Visor / Cockpit HUD */}
        <radialGradient id={hudVisorGradId} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="45%" stopColor="#06B6D4" />
          <stop offset="85%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#0C4A6E" />
        </radialGradient>

        {/* Gradiente da Chama Plasma Central */}
        <linearGradient id={mainPlasmaGradId} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="20%" stopColor="#67E8F9" />
          <stop offset="55%" stopColor="#06B6D4" />
          <stop offset="85%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
        </linearGradient>

        {/* Gradiente Chamas Laterais */}
        <linearGradient id={sidePlasmaGradId} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="40%" stopColor="#38BDF8" />
          <stop offset="80%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>

        {/* Filtros de Brilho Neon */}
        <filter id={neonGlowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id={plasmaGlowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <clipPath id={squircleClipId}>
          <rect x="24" y="24" width="464" height="464" rx="108" ry="108" />
        </clipPath>
      </defs>

      {/* Fundo Squircle Arredondado */}
      <rect x="24" y="24" width="464" height="464" rx="108" ry="108" fill={`url(#${bgGradId})`} />

      <g clipPath={`url(#${squircleClipId})`}>
        {/* Fonte de luz distante (o farol que o foguete persegue) */}
        <circle cx="120" cy="120" r="190" fill={`url(#${sunGlowGradId})`} />
        <circle cx="120" cy="120" r="22" fill="#FFF7E0" />

        {/* Linhas e Trilhas de Circuito Tech no Fundo */}
        <g opacity="0.2" stroke="#38BDF8" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M 64 160 L 120 160 L 160 200 L 160 280" />
          <path d="M 80 380 L 140 380 L 180 340 L 180 300" />
          <path d="M 400 120 L 350 120 L 320 150" />
          <path d="M 440 280 L 380 280 L 340 320 L 340 400" />
          <circle cx="160" cy="280" r="5" fill="#38BDF8" />
          <circle cx="180" cy="300" r="5" fill="#38BDF8" />
          <circle cx="320" cy="150" r="5" fill="#38BDF8" />
          <circle cx="340" cy="400" r="5" fill="#38BDF8" />
        </g>

        {/* FOGUETE TECH COCKPIT (DIAGONAL 45°) */}
        <g transform="translate(256, 256) rotate(-45) translate(-256, -256)">
        {/* Partículas / Centelhas de Propulsão */}
        <g filter={`url(#${neonGlowId})`}>
          <circle cx="256" cy="430" r="6" fill="#67E8F9" />
          <circle cx="240" cy="460" r="5" fill="#38BDF8" />
          <circle cx="272" cy="455" r="5" fill="#A855F7" />
          <circle cx="230" cy="490" r="4" fill="#C084FC" />
          <circle cx="282" cy="485" r="4" fill="#22D3EE" />
          <circle cx="256" cy="510" r="3" fill="#E0E7FF" />
        </g>

        {/* Pluma de Plasma dos Motores Laterais */}
        <path d="M 205 375 Q 195 440 185 470 Q 205 430 215 375 Z" fill={`url(#${sidePlasmaGradId})`} filter={`url(#${plasmaGlowId})`} />
        <path d="M 307 375 Q 317 440 327 470 Q 307 430 297 375 Z" fill={`url(#${sidePlasmaGradId})`} filter={`url(#${plasmaGlowId})`} />

        {/* Pluma de Plasma do Motor Principal */}
        <path d="M 234 380 Q 215 450 256 500 Q 297 450 278 380 Z" fill={`url(#${mainPlasmaGradId})`} filter={`url(#${plasmaGlowId})`} />
        {/* Núcleo Superaquecido Branco da Chama Principal */}
        <path d="M 244 380 Q 235 430 256 460 Q 277 430 268 380 Z" fill="#FFFFFF" opacity="0.95" />

        {/* Asas / Estabilizadores Laterais Tech */}
        {/* Asa Esquerda */}
        <path d="M 220 280 L 160 360 L 166 385 L 216 360 Z" fill={`url(#${wingGradId})`} stroke="#38BDF8" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M 160 360 L 166 385 L 180 375 Z" fill="#22D3EE" opacity="0.8" />
        <line x1="160" y1="360" x2="220" y2="280" stroke="#67E8F9" strokeWidth="4" strokeLinecap="round" filter={`url(#${neonGlowId})`} />

        {/* Asa Direita */}
        <path d="M 292 280 L 352 360 L 346 385 L 296 360 Z" fill={`url(#${wingGradId})`} stroke="#38BDF8" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M 352 360 L 346 385 L 332 375 Z" fill="#22D3EE" opacity="0.8" />
        <line x1="352" y1="360" x2="292" y2="280" stroke="#67E8F9" strokeWidth="4" strokeLinecap="round" filter={`url(#${neonGlowId})`} />

        {/* Motores Foguete (Bocais) */}
        <rect x="200" y="365" width="18" height="15" rx="3" fill="#1E293B" stroke="#06B6D4" strokeWidth="2" />
        <rect x="294" y="365" width="18" height="15" rx="3" fill="#1E293B" stroke="#06B6D4" strokeWidth="2" />
        <rect x="236" y="375" width="40" height="15" rx="4" fill="#0F172A" stroke="#22D3EE" strokeWidth="2.5" />

        {/* Fuselagem Central (Corpo do Foguete) */}
        <path d="M 256 86 C 220 150 216 260 218 375 L 294 375 C 296 260 292 150 256 86 Z" fill={`url(#${fuselageGradId})`} stroke="#38BDF8" strokeWidth="3" />

        {/* Painéis e Vincos Tech da Fuselagem */}
        <path d="M 256 86 L 256 375" stroke="#38BDF8" strokeWidth="2" opacity="0.75" />
        <path d="M 226 210 Q 256 220 286 210" fill="none" stroke="#38BDF8" strokeWidth="2.5" opacity="0.8" />
        <path d="M 220 310 Q 256 324 292 310" fill="none" stroke="#38BDF8" strokeWidth="2.5" opacity="0.8" />

        {/* Faixas e Acentos Neon na Fuselagem */}
        <line x1="228" y1="235" x2="228" y2="290" stroke="#A855F7" strokeWidth="4" strokeLinecap="round" filter={`url(#${neonGlowId})`} />
        <line x1="284" y1="235" x2="284" y2="290" stroke="#A855F7" strokeWidth="4" strokeLinecap="round" filter={`url(#${neonGlowId})`} />

        {/* Nariz Tech do Foguete com Ponteira Luminescente */}
        <path d="M 256 86 L 250 135 L 262 135 Z" fill="#38BDF8" opacity="0.9" />
        <line x1="256" y1="80" x2="256" y2="105" stroke="#67E8F9" strokeWidth="5" strokeLinecap="round" filter={`url(#${neonGlowId})`} />

        {/* Cockpit HUD / Visor Redondo Circular */}
        <circle cx="256" cy="180" r="28" fill="#0B0F17" stroke="#38BDF8" strokeWidth="4" />
        <circle cx="256" cy="180" r="22" fill={`url(#${hudVisorGradId})`} filter={`url(#${neonGlowId})`} />
        {/* Retículo / Elementos Tech do HUD dentro do Visor */}
        <circle cx="256" cy="180" r="14" fill="none" stroke="#E0F2FE" strokeWidth="2" strokeDasharray="4 3" opacity="0.9" />
        <path d="M 246 180 L 266 180 M 256 170 L 256 190" stroke="#FFFFFF" strokeWidth="2" opacity="0.85" />
        <ellipse cx="252" cy="174" rx="7" ry="3.5" fill="#FFFFFF" opacity="0.7" transform="rotate(-30 252 174)" />

          {/* Aleta Dorsal Central */}
          <polygon points="253,300 259,300 262,370 250,370" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />
        </g>

        {/* Reflexo perto da base (refletindo a luz do foguete) */}
        <circle cx="360" cy="420" r="90" fill={`url(#${reflGlowGradId})`} />
        <line x1="70" y1="420" x2="442" y2="420" stroke="#FDE68A" strokeWidth="2" strokeOpacity="0.45" strokeLinecap="round" />
      </g>

      {/* Borda Neon Iluminada (por cima do conteúdo recortado) */}
      <rect x="24" y="24" width="464" height="464" rx="108" ry="108" fill="none" stroke={`url(#${borderGradId})`} strokeWidth="8" opacity="0.9" />
      <rect x="26" y="26" width="460" height="460" rx="106" ry="106" fill="none" stroke="#22D3EE" strokeWidth="2" opacity="0.4" filter={`url(#${neonGlowId})`} />
    </svg>
  );

  if (!showStatusDot) {
    return svgContent;
  }

  return (
    <div className="relative inline-flex shrink-0">
      {svgContent}
      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full flex items-center justify-center">
        <span className="w-1 h-1 bg-white rounded-full animate-ping" />
      </div>
    </div>
  );
};
