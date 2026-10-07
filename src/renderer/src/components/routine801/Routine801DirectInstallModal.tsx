import React from 'react';
import { X, Plus } from 'lucide-react';
import type { Routine801DirectType } from '../../utils/routine801ModalUtils';

interface Routine801DirectInstallModalProps {
  nome: string;
  versao: string;
  tipo: Routine801DirectType;
  action: 'install' | 'repo_add_only';
  onChangeNome: (value: string) => void;
  onChangeVersao: (value: string) => void;
  onChangeTipo: (value: Routine801DirectType) => void;
  onChangeAction: (value: 'install' | 'repo_add_only') => void;
  onCancel: () => void;
  onExecute: () => void;
}

const actionButtonClass = (active: boolean) =>
  `p-2.5 rounded border text-left transition-all cursor-pointer ${
    active
      ? 'border-primary bg-primary/10 text-primary font-medium'
      : 'border-border bg-card text-muted-foreground hover:bg-muted'
  }`;

export const Routine801DirectInstallModal: React.FC<Routine801DirectInstallModalProps> = ({
  nome,
  versao,
  tipo,
  action,
  onChangeNome,
  onChangeVersao,
  onChangeTipo,
  onChangeAction,
  onCancel,
  onExecute
}) => (
  <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-primary/10 border border-primary/20 text-primary">
            <Plus className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold">Instalação Direta de Pacote (Versão Específica)</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 text-xs">
        <p className="text-muted-foreground leading-relaxed">
          Adicione e instale qualquer pacote ou versão específica no Apache Karaf local (ex: serviços da release <code className="text-primary font-mono font-bold">1.38.*</code>, <code className="text-primary font-mono font-bold">1.39.*</code> ou <code className="text-primary font-mono font-bold">0.39.*</code>), com resolução automática de repositório Maven.
        </p>

        {/* Nome da Feature */}
        <div className="space-y-1.5">
          <label className="font-medium text-foreground block">
            Nome da Feature OSGi:
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => onChangeNome(e.target.value)}
            placeholder="ex: winthor-atualizacao-dados"
            className="w-full px-3 py-1.5 bg-background border border-input rounded font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            list="common-winthor-features"
          />
          <datalist id="common-winthor-features">
            <option value="winthor-atualizacao-dados" />
            <option value="winthor-ferramenta-servidor" />
            <option value="winthor-autocadastro-cliente-fidelidade" />
            <option value="winthor-central-notificacao" />
            <option value="winthor-expedicao-painel-operacao" />
            <option value="winthor-fin-1531" />
            <option value="winthor-fin-805" />
          </datalist>
        </div>

        {/* Versão e Tipo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-medium text-foreground block">
              Versão Específica:
            </label>
            <input
              type="text"
              value={versao}
              onChange={(e) => onChangeVersao(e.target.value)}
              placeholder="ex: 1.38.0.2 ou 1.39.1.6"
              className="w-full px-3 py-1.5 bg-background border border-input rounded font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground block">
              Tipo de Projeto:
            </label>
            <select
              value={tipo}
              onChange={(e) => onChangeTipo(e.target.value as Routine801DirectType)}
              className="w-full px-3 py-1.5 bg-background border border-input rounded text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="SERVICO">SERVIÇO (br.com.pcsist.winthor.servico)</option>
              <option value="ROTINA">ROTINA (br.com.pcsist.winthor.rotina)</option>
            </select>
          </div>
        </div>

        {/* Ação */}
        <div className="space-y-1.5">
          <label className="font-medium text-foreground block">
            Ação a Executar:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeAction('install')}
              className={actionButtonClass(action === 'install')}
            >
              <div className="font-semibold text-foreground">Registrar e Instalar</div>
              <div className="text-2xs text-muted-foreground mt-0.5">
                Executa repo-add e feature:install -r -u
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeAction('repo_add_only')}
              className={actionButtonClass(action === 'repo_add_only')}
            >
              <div className="font-semibold text-foreground">Apenas Registrar Repo</div>
              <div className="text-2xs text-muted-foreground mt-0.5">
                Executa apenas feature:repo-add
              </div>
            </button>
          </div>
        </div>

        {/* Preview dos comandos gerados */}
        <div className="p-2.5 rounded border border-border bg-muted/30 font-mono text-2xs space-y-1">
          <div className="text-muted-foreground uppercase text-2xs tracking-wider">Preview dos Comandos Karaf:</div>
          <div className="text-primary truncate">
            $ feature:repo-add mvn:br.com.pcsist.winthor.{tipo === 'ROTINA' ? 'rotina' : 'servico'}/{nome.trim()}-features/{versao.trim()}/xml/features
          </div>
          {action === 'install' && (
            <div className="text-primary truncate">
              $ feature:install -r -u {nome.trim()}/{versao.trim()}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onExecute}
          disabled={!nome.trim() || !versao.trim()}
          className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          Executar no Karaf
        </button>
      </div>
    </div>
  </div>
);
