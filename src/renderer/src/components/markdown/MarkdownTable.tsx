import React from 'react';
import { MarkdownInline } from './MarkdownInline';

interface MarkdownTableProps {
  header: string[];
  rows: string[][];
  searchTerm: string;
}

export const MarkdownTable: React.FC<MarkdownTableProps> = ({ header, rows, searchTerm }) => (
  <div className="my-5 rounded-xl border border-border/80 overflow-hidden shadow-2xs">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-muted/70 border-b border-border text-foreground font-bold">
            {header.map((hc, hIdx) => (
              <th key={hIdx} className="px-4 py-3 font-bold uppercase tracking-wider text-2xs">
                <MarkdownInline text={hc} searchTerm={searchTerm} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-card' : 'bg-muted/20 hover:bg-muted/40 transition-colors'}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2.5 text-foreground/90 leading-relaxed font-medium">
                  <MarkdownInline text={cell} searchTerm={searchTerm} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
