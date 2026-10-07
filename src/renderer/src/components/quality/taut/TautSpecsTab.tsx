import React from 'react';
import type { TautSpecSummary } from '../../../../../shared/types';
import { countSpecTests } from '../../../utils/tautPanelUtils';

interface TautSpecsTabProps {
  specs: TautSpecSummary[];
}

export const TautSpecsTab: React.FC<TautSpecsTabProps> = ({ specs }) => (
  <div className="rounded-xl bg-card border border-border shadow-2xs p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
        Arquivos de Teste no Cypress ({specs.length} arquivos)
      </h3>
      <span className="text-xs text-muted-foreground">
        Total de testes: <strong>{countSpecTests(specs)}</strong>
      </span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
      {specs.map((spec) => (
        <div
          key={spec.relativePath}
          className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/40 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-2xs font-bold bg-primary/10 text-primary font-mono">
              {spec.module}
            </span>
            <span className="text-xs font-mono font-bold text-foreground">
              {spec.testCount} {spec.testCount === 1 ? 'teste' : 'testes'}
            </span>
          </div>

          <div className="font-mono text-xs font-semibold text-foreground truncate" title={spec.relativePath}>
            {spec.specFile}
          </div>

          <div className="text-2xs text-muted-foreground font-mono truncate">
            {spec.relativePath}
          </div>

          {/* Tags do Spec */}
          {spec.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {spec.tags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded text-2xs font-mono bg-muted text-muted-foreground border border-border/60"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);
