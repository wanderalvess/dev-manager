import React from 'react';
import { Database, FileCode2, Cpu } from 'lucide-react';

interface QaRunnerJsonTabProps {
  rawJson: string;
  onChangeJson: (value: string) => void;
  onOpenFetchPayload: () => void;
  onLoadSample: () => void;
  onAutoExtract: () => void;
}

export const QaRunnerJsonTab: React.FC<QaRunnerJsonTabProps> = ({
  rawJson,
  onChangeJson,
  onOpenFetchPayload,
  onLoadSample,
  onAutoExtract
}) => {
  return (
    <div className="flex-1 flex flex-col p-3 overflow-hidden gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-mono">
          Payload JSON da API ou PDV:
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFetchPayload}
            className="text-[11px] text-primary font-semibold hover:text-primary/80 flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20"
            title="Obter payload JSON gravado no banco (PCINTEGRACAOCORE) ou via API REST externa"
          >
            <Database className="w-3 h-3 text-primary" />
            <span>Obter Payload</span>
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={onLoadSample}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            title="Preenche com o JSON de exemplo do template"
          >
            <FileCode2 className="w-3 h-3 text-primary" />
            <span>Exemplo</span>
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={onAutoExtract}
            className="text-[11px] text-foreground font-semibold hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
            title="Extrai parâmetros como codFilial e numCupom automaticamente do JSON"
          >
            <Cpu className="w-3 h-3 text-emerald-500" />
            <span>Mapear Binds</span>
          </button>
        </div>
      </div>

      <textarea
        value={rawJson}
        onChange={(e) => onChangeJson(e.target.value)}
        placeholder='{\n  "codFilial": "1",\n  "numCupom": 4387,\n  "vlTotal": 768.7,\n  ...\n}'
        className="flex-1 w-full bg-background border border-border rounded-md p-2.5 font-mono text-[11px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
};
