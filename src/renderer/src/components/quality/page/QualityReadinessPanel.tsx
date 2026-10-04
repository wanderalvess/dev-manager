import React from 'react';
import type { QualityMetrics } from '../../../utils/qualityPageUtils';
import {
  getProgressWidth,
  getReadinessSummary,
  getReadinessVerdict
} from '../../../utils/qualityPageView';

interface QualityReadinessPanelProps {
  metrics: QualityMetrics;
}

export const QualityReadinessPanel: React.FC<QualityReadinessPanelProps> = ({ metrics }) => {
  const verdict = getReadinessVerdict(metrics.readinessScore);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Card Semáforo de Liberação */}
      <div className="lg:col-span-1 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-black text-foreground">Semáforo de Liberação</h3>
          <span className="text-[10px] font-mono text-muted-foreground">Critérios PO</span>
        </div>

        <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center border-4 text-3xl font-black ${verdict.ringClass}`}
          >
            {metrics.readinessScore}%
          </div>
          <h4 className="text-sm font-bold text-foreground">{verdict.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {getReadinessSummary(metrics.failed, metrics.pending)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
          <div className="font-bold text-foreground text-[11px] uppercase tracking-wider">Recomendações para o PO:</div>
          <ul className="space-y-1 text-muted-foreground list-disc pl-4">
            <li>Validar os critérios de aceite junto às áreas de negócio.</li>
            <li>Conferir logs de homologação na aba <strong className="text-foreground">Logs</strong> antes da subida.</li>
            <li>Acionar desenvolvedores pelo Azure DevOps caso haja bugs abertos.</li>
          </ul>
        </div>
      </div>

      {/* Checklist de Homologação */}
      <div className="lg:col-span-2 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-black text-foreground">Distribuição e Cobertura</h3>
          <span className="text-[10px] font-mono text-muted-foreground">{metrics.total} itens mapeados</span>
        </div>

        <div className="space-y-3">
          {/* Barra de progresso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Progresso Global dos Testes</span>
              <span className="text-foreground font-mono">{metrics.passRate}% concluído</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                style={{ width: getProgressWidth(metrics.passed, metrics.total) }}
                className="bg-emerald-500 h-full transition-all"
                title="Aprovados"
              />
              <div
                style={{ width: getProgressWidth(metrics.inProgress, metrics.total) }}
                className="bg-cyan-500 h-full transition-all"
                title="Em Andamento"
              />
              <div
                style={{ width: getProgressWidth(metrics.blocked, metrics.total) }}
                className="bg-amber-500 h-full transition-all"
                title="Bloqueados"
              />
              <div
                style={{ width: getProgressWidth(metrics.failed, metrics.total) }}
                className="bg-rose-500 h-full transition-all"
                title="Falhas"
              />
            </div>
          </div>

          {/* Status por categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
              <span className="text-xs font-bold text-foreground">Rotinas Delphi</span>
              <p className="text-[11px] text-muted-foreground">
                Executáveis locais testados diretamente com suporte a dados do Oracle.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
              <span className="text-xs font-bold text-foreground">Serviços &amp; Bundles Karaf</span>
              <p className="text-[11px] text-muted-foreground">
                Saúde dos bundles OSGi e portas de comunicação ativas.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
              <span className="text-xs font-bold text-foreground">APIs de Integração</span>
              <p className="text-[11px] text-muted-foreground">
                Validadores de contratos e respostas de microsserviços.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
              <span className="text-xs font-bold text-foreground">Fluxos End-to-End</span>
              <p className="text-[11px] text-muted-foreground">
                Jornadas completas do usuário cobrindo ponta a ponta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
