import React, { useId } from 'react';

const EDGE = 'stroke-muted-foreground/60';
const TEXT = 'fill-foreground';
const QUIET = 'fill-muted-foreground';

const Box: React.FC<{ x: number; y: number; w: number; h: number; main?: boolean; name: string; lines: string[] }> = ({ x, y, w, h, main, name, lines }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="8" className={main ? 'fill-primary/10 stroke-primary' : `fill-card ${EDGE}`} strokeWidth={main ? 2 : 1.25} />
    <text x={x + 14} y={y + 24} fontSize="13" fontWeight="600" className={TEXT}>
      {name}
    </text>
    {lines.map((line, i) => (
      <text key={line} x={x + 14} y={y + 40 + i * 16} fontSize="11.5" className={TEXT}>
        {line}
      </text>
    ))}
  </g>
);

/** Como as peças se encaixam: o Hub roda o INFR-Docker, que cria os três containers no WSL. */
export const InfrDockerDiagram: React.FC = () => {
  // id próprio: o app mantém telas montadas, e um marcador repetido aponta para a cópia escondida (seta sem ponta)
  const arrow = `infr-guide-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 760 372" role="img" aria-label="O Hub roda os scripts do INFR-Docker, que criam os containers no WSL" className="w-full h-auto">
      <defs>
        <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="fill-muted-foreground" />
        </marker>
      </defs>
      <text x="24" y="34" fontSize="15" fontWeight="600" className={TEXT}>
        O Hub roda os scripts do INFR-Docker, que criam os containers no WSL
      </text>

      <rect x="24" y="56" width="216" height="264" rx="8" className={`fill-muted/40 ${EDGE}`} strokeWidth="1" />
      <text x="40" y="80" fontSize="13" fontWeight="600" className={TEXT}>
        Windows
      </text>
      <Box x={40} y={96} w={184} h={72} main name="Hub Manager" lines={['Assistente INFR', 'logs e snapshots']} />
      <Box x={40} y={232} w={184} h={72} name="INFR-Docker" lines={['scripts e Dockerfiles', 'manifestos de versão']} />

      <rect x="312" y="56" width="424" height="292" rx="8" className={`fill-none ${EDGE}`} strokeWidth="1" />
      <text x="328" y="80" fontSize="13" fontWeight="600" className={TEXT}>
        Distro WSL ubuntu2604-winthor + Docker
      </text>
      <rect x="328" y="96" width="392" height="236" rx="8" className={`fill-muted/40 ${EDGE}`} strokeWidth="1" strokeDasharray="4 4" />
      <text x="344" y="116" fontSize="11.5" className={QUIET}>
        rede winthor-network
      </text>
      <Box x={344} y={136} w={152} h={72} name="Banco Oracle" lines={['oracle-nome · 1521', 'dados do WinThor']} />
      <Box x={552} y={136} w={152} h={72} name="WTA" lines={['wta-nome · 8080', 'WinThor web e APIs']} />
      <Box x={552} y={244} w={152} h={72} name="WSH" lines={['wsh-nome', 'integra o ERP']} />

      <g fill="none" className={EDGE} strokeWidth="1.25">
        <path d="M132 168V232" markerEnd={`url(#${arrow})`} />
        <path d="M224 268H328" markerEnd={`url(#${arrow})`} />
        <path d="M552 172H496" markerEnd={`url(#${arrow})`} />
        <path d="M628 244V208" markerEnd={`url(#${arrow})`} />
        <path d="M552 280H420V208" markerEnd={`url(#${arrow})`} />
      </g>
      <g fontSize="11.5" className={QUIET}>
        <text x="140" y="204">
          executa
        </text>
        <text x="276" y="244" textAnchor="middle">
          cria os
        </text>
        <text x="276" y="258" textAnchor="middle">
          containers
        </text>
        <text x="524" y="164" textAnchor="middle">
          conecta
        </text>
        <text x="620" y="230" textAnchor="end">
          confere as features
        </text>
        <text x="486" y="272" textAnchor="middle">
          lê e grava
        </text>
      </g>
    </svg>
  );
};
