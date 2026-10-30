import React from 'react';
import type { GuideRow } from './scenarioGuideData';

/** Peças de texto dos guias da Central de Ajuda, no mesmo visual do guia Ambientes WinThor no Docker. */
export const GUIDE_H2 = 'text-base font-bold text-foreground mt-8 mb-2 scroll-mt-4';
export const GUIDE_H3 = 'text-sm font-bold text-foreground mt-4 mb-1.5';
export const GUIDE_P = 'text-sm leading-relaxed text-foreground/85';
export const GUIDE_CODE = 'font-mono text-[0.92em] text-foreground';
export const GUIDE_OL = 'list-decimal pl-5 space-y-1 text-sm text-foreground/85 marker:text-muted-foreground';
export const GUIDE_UL = 'list-disc pl-5 space-y-1 text-sm text-foreground/85';
const TH = 'text-left font-semibold text-foreground bg-muted/50 px-3 py-2 border-b border-border';
const TD = 'align-top px-3 py-2 border-b border-border/60 text-foreground/85';

interface GuideTableProps {
  head: string[];
  rows: GuideRow[];
  /** Colunas em fonte mono (índices). */
  mono?: number[];
}

/** Tabela de 2 ou 3 colunas: a primeira em destaque, as demais em texto. */
export const GuideTable: React.FC<GuideTableProps> = ({ head, rows, mono = [] }) => (
  <div className="overflow-x-auto rounded-xl border border-border/80 scrollbar-thin">
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className={TH}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            {[row.name, row.text, row.extra].slice(0, head.length).map((cell, i) => (
              <td key={i} className={`${TD} ${i === 0 ? 'font-semibold text-foreground' : ''} ${mono.includes(i) ? 'font-mono' : ''}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface GuideSectionNavProps {
  sections: readonly (readonly [string, string])[];
  /** Prefixo dos ids das seções (`<prefixo>-<id>`). */
  prefix: string;
}

/** Atalhos para as seções do guia, no alto da página. */
export const GuideSectionNav: React.FC<GuideSectionNavProps> = ({ sections, prefix }) => (
  <nav aria-label="Seções do guia" className="flex flex-wrap gap-1.5 pt-1">
    {sections.map(([id, label]) => (
      <button
        key={id}
        type="button"
        onClick={() => document.getElementById(`${prefix}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="px-2.5 py-1 rounded-full border border-border/80 text-2xs text-foreground/80 hover:bg-muted cursor-pointer"
      >
        {label}
      </button>
    ))}
  </nav>
);

/** Aviso destacado dentro do guia. */
export const GuideNote: React.FC<{ tone?: 'warning' | 'info'; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <div
    className={`p-3 rounded-xl border text-sm leading-relaxed text-foreground/90 ${
      tone === 'warning' ? 'bg-warning/10 border-warning/30' : 'bg-primary/5 border-primary/20'
    }`}
  >
    {children}
  </div>
);
