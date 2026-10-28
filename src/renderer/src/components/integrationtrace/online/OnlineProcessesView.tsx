import React from 'react';
import { Info } from 'lucide-react';
import {
  ONLINE_CATEGORY_ORDER,
  ONLINE_PROCESSES,
  isMapped,
  onlineKind,
  sameEndpoint,
  type OnlineProcess
} from '../../../../../shared/onlineProcessCatalog';

const METHOD_CLASS: Record<OnlineProcess['method'], string> = {
  GET: 'bg-info/10 text-info',
  POST: 'bg-success/10 text-success',
  PUT: 'bg-warning/10 text-warning'
};

const ProcessRow: React.FC<{ process: OnlineProcess }> = ({ process }) => {
  const twins = sameEndpoint(process);
  return (
    <li className="py-2 grid grid-cols-1 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,12rem)] gap-x-4 gap-y-1">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{process.name}</p>
        <p className="text-2xs text-muted-foreground font-mono truncate" title={process.id}>
          {process.id}
        </p>
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-mono text-foreground flex items-center gap-2 min-w-0">
          <span className={`px-1.5 py-0.5 rounded text-2xs font-semibold shrink-0 ${METHOD_CLASS[process.method]}`}>{process.method}</span>
          <span className="break-all">{process.apiPath}</span>
        </p>
        <p className="text-2xs text-muted-foreground">
          {process.apiProject}
          {twins.length > 0 && <> · mesmo endpoint de {twins.map((t) => t.name.toLowerCase()).join(' e ')}: só {process.method === 'GET' ? 'os parâmetros diferenciam' : 'o corpo diferencia'}</>}
        </p>
      </div>
      <div className="min-w-0 text-2xs">
        <p className="text-foreground">{onlineKind(process) === 'leitura' ? 'Só lê no Oracle' : 'Grava no WinThor'}</p>
        <p className={isMapped(process) ? 'text-muted-foreground font-mono break-words' : 'text-muted-foreground italic'}>
          {isMapped(process) ? process.oracleTables!.join(', ') : 'Tabelas a mapear'}
        </p>
      </div>
    </li>
  );
};

/**
 * Processos online do PDVOmni: o que o PDV chama direto no WTA, sem o WSH. Por enquanto, o catálogo e como mapear
 * as tabelas de cada processo; a consulta do resultado vem quando o mapeamento estiver feito.
 */
export const OnlineProcessesView: React.FC = () => {
  const mapped = ONLINE_PROCESSES.filter(isMapped).length;
  return (
    <div className="space-y-3">
      <section className="border border-border rounded-xl p-3 bg-card space-y-1.5" aria-label="Sobre os processos online">
        <h2 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" /> O PDV chama o WinThor direto, sem passar pelo WSH
        </h2>
        <p className="text-xs text-muted-foreground">
          Pré-venda, crédito, estoque e notas acontecem em tempo real entre o PDVOmni e o WTA. Não ficam na PCINTEGRACAOCORE, por
          isso o Monitor do WSH não os vê. Tabelas mapeadas: {mapped} de {ONLINE_PROCESSES.length}.
        </p>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Como mapear as tabelas de um processo</summary>
          <ol className="list-decimal pl-5 mt-1 space-y-0.5">
            <li>No Banco de Dados (DB Studio), abra o Statement Tracer na conexão Oracle do WinThor e inicie a captura.</li>
            <li>Faça a operação no PDV: uma pré-venda, um consumo de crédito, uma consulta de estoque.</li>
            <li>Pare a captura. Os INSERT, UPDATE e SELECT do WTA mostram as tabelas que o processo usa.</li>
          </ol>
        </details>
      </section>

      {ONLINE_CATEGORY_ORDER.map((category) => (
        <section key={category} className="border border-border rounded-xl px-3 py-2 bg-card" aria-label={category}>
          <h3 className="text-xs font-semibold text-foreground">{category}</h3>
          <ul className="divide-y divide-border">
            {ONLINE_PROCESSES.filter((p) => p.category === category).map((p) => (
              <ProcessRow key={p.id} process={p} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
