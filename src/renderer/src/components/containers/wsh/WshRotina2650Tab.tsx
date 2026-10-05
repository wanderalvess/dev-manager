import React from 'react';
import { Activity } from 'lucide-react';
import { WSH_ROTINA_2650_URL } from '../../../utils/wshUtilsModalUtils';

interface WshRotina2650TabProps {
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const WshRotina2650Tab: React.FC<WshRotina2650TabProps> = ({ copiedKey, onCopy }) => (
  <div className="space-y-4">
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
        <Activity className="w-4 h-4" />
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Configuração da Rotina 2650 no WinThor</strong>
        A Rotina 2650 cadastra o endereço do WinThor Server Hub (WSH) no ERP para permitir a emissão de notas fiscais, sincronização com mobile e integrações REST.
      </div>
    </div>

    <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <span>Valores Recomendados para Ambiente Local/Dev:</span>
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
          <span className="text-[11px] text-muted-foreground block mb-0.5">URL de Conexão WSH</span>
          <div className="font-mono text-xs font-bold text-foreground flex items-center justify-between">
            <span>{WSH_ROTINA_2650_URL}</span>
            <button
              onClick={() => onCopy(WSH_ROTINA_2650_URL, 'wsh-url')}
              className="text-2xs text-primary hover:underline cursor-pointer"
            >
              {copiedKey === 'wsh-url' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
          <span className="text-[11px] text-muted-foreground block mb-0.5">Nome do Serviço</span>
          <div className="font-mono text-xs font-bold text-foreground">
            WSH LOCAL DOCKER
          </div>
        </div>

        <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
          <span className="text-[11px] text-muted-foreground block mb-0.5">Porta Padrão</span>
          <div className="font-mono text-xs font-bold text-foreground">
            8080 (mapeada no host)
          </div>
        </div>

        <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
          <span className="text-[11px] text-muted-foreground block mb-0.5">Validação de Conexão</span>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Clique em "Testar Conexão" na rotina
          </div>
        </div>
      </div>

      <div className="p-3 bg-muted/20 rounded-lg border border-border/40 text-[11px] text-muted-foreground space-y-1">
        <strong className="text-foreground block mb-0.5">Dica Importante:</strong>
        Se a rotina relatar falha de comunicação, verifique se o container <code className="text-foreground font-mono">wsh-winthor</code> (ou <code className="text-foreground font-mono">wsh-local</code>) está com status <strong>running</strong> e se a porta 8080 não está ocupada por outra aplicação.
      </div>
    </div>
  </div>
);
