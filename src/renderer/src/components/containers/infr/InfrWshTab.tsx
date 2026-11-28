import React from 'react';
import { Key, Play, RotateCw } from 'lucide-react';
import { buildWshSetupCommand, isValidWinthorVersion, winthorVersionPorts } from '../../../../../shared/infrWinthorVersion';

interface InfrWshTabProps {
  version: string;
  isExecuting: boolean;
  onRun: () => void;
}

export const InfrWshTab: React.FC<InfrWshTabProps> = ({ version, isExecuting, onRun }) => {
  const versioned = isValidWinthorVersion(version);
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
          <Key className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground font-semibold block mb-0.5">
            Setup Automatizado do Winthor Smart Hub (WSH)
          </strong>
          Executa <code className="text-foreground font-mono">wsh_setup.sh</code> na pasta <code className="text-foreground font-mono">wsh-winthor</code>. Cria o container WSH configurado com o <code className="text-foreground font-mono">Winthor.ini</code> e variáveis do <code className="text-foreground font-mono">.env</code>.
          {!versioned && ' Para uma versão específica do WinThor, informe-a no campo de versão acima.'}
          {versioned && (
            <>
              {' '}Com a versão {version}, usa o <code className="text-foreground font-mono">.env.{version}</code>. Nele ficam o jar do WSH daquela versão (<code className="text-foreground font-mono">WSH_JAR</code>), o banco (<code className="text-foreground font-mono">{`DB_HOST=oracle-${version}`}</code>), o WTA (<code className="text-foreground font-mono">{`WTA_HOST=wta-${version}`}</code>) e a porta {winthorVersionPorts(version).wsh}. O WSH só sobe se o WTA tiver as features na versão que ele exige.
            </>
          )}
        </div>
      </div>

      <div className="bg-info/5 border border-info/20 rounded-xl p-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Já tem um WSH e quer só trocar o jar por uma versão nova?</strong>
        Não precisa recriar o container. Na tela de containers, use <strong className="text-foreground">Atualizar WSH</strong> no cartão (ou no nó WSH da topologia): o Hub baixa o instalador da TOTVS, confere o WTA, guarda o jar atual e reinicia.
      </div>

      <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
        <div className="p-3 bg-[#090D14] rounded-lg border border-border/60 text-xs font-mono text-emerald-400">
          {buildWshSetupCommand(version)}
        </div>

        <button
          onClick={onRun}
          disabled={isExecuting}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary hover:bg-primary text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {isExecuting ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isExecuting ? 'Iniciando Setup...' : versioned ? `Executar Setup WSH ${version}` : 'Executar Setup WSH'}</span>
        </button>
      </div>
    </div>
  );
};
