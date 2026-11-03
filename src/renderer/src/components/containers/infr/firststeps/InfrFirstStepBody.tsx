import React from 'react';
import { CheckCircle2, ExternalLink, FolderOpen, Play, XCircle } from 'lucide-react';
import type { InfrFirstStep } from '../../../../../../shared/infrFirstSteps';
import { INFR_TEAM_DRIVE_URL, WSL_INSTALL_COMMAND, WTA_INSTALLER_PATH, firstStepsContainers } from '../../../../../../shared/infrFirstStepsCommands';
import { winthorVersionPorts } from '../../../../../../shared/infrWinthorVersion';
import type { InfrFirstStepsState } from '../../../../hooks/containers/useInfrFirstSteps';
import { InfrCommandLine } from '../InfrCommandLine';
import { InfrFirstStepsDistro } from './InfrFirstStepsDistro';
import { InfrFirstStepsEnv } from './InfrFirstStepsEnv';
import { FS_BTN, FS_PRIMARY } from './InfrFirstStepRow';

const WSL_STEPS = [
  ['1. Executar', 'O Windows pede permissão de administrador e baixa o WSL.'],
  ['2. Reiniciar', 'Sem o reinício o WSL não sobe. Salve o que estiver aberto.'],
  ['3. Abrir o Hub', 'Ele volta nesta aba e confere de novo sozinho.']
];

const FileLine: React.FC<{ ok: boolean; name: string; where: string; children?: React.ReactNode }> = ({ ok, name, where, children }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
    {ok ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <XCircle className="w-4 h-4 text-danger shrink-0" />}
    <span className="w-48 font-semibold text-foreground">{name}</span>
    <code className="flex-1 min-w-[12rem] font-mono text-2xs text-foreground/80">{where}</code>
    {!ok && children}
  </div>
);

/** O que fazer em cada etapa: comandos com Copiar/Executar, formulários e atalhos. */
export const InfrFirstStepBody: React.FC<{ step: InfrFirstStep; f: InfrFirstStepsState }> = ({ step, f }) => {
  const p = f.result?.probe;
  switch (step.id) {
    case 'wsl':
      return (
        <>
          <InfrCommandLine command={WSL_INSTALL_COMMAND} runLabel="Executar como administrador" onRun={() => f.action({ id: 'wsl-install' })} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {WSL_STEPS.map(([t, d]) => (
              <div key={t} className="p-3 rounded-lg border border-border/70 bg-muted/20 text-2xs text-foreground/80 leading-snug">
                <span className="block text-xs font-semibold text-foreground mb-0.5">{t}</span>
                {d}
              </div>
            ))}
          </div>
          <p className="text-2xs text-muted-foreground">Sem permissão de administrador nesta máquina? Peça ao suporte para rodar o comando acima.</p>
        </>
      );
    case 'distro':
      return <InfrFirstStepsDistro f={f} />;
    case 'docker':
      return (
        <button type="button" onClick={f.startDocker} className={FS_PRIMARY}>
          <Play className="w-3.5 h-3.5" /> Iniciar o Docker na distro
        </button>
      );
    case 'infr':
      return (
        <>
          {step.commands?.map((cmd) => (
            <InfrCommandLine
              key={cmd.command}
              block
              label={cmd.label}
              command={cmd.command}
              runLabel="Abrir no terminal"
              onRun={() => f.action({ id: cmd.command.includes('git clone') ? 'clone' : 'checkout', infrPath: f.infrPath })}
            />
          ))}
        </>
      );
    case 'files': {
      const files = p?.files;
      return (
        <>
          <FileLine ok={!!files?.pcsist} name="pcsist.tar.gz" where="linux-winthor/utils/ · monta a imagem do WTA">
            <button type="button" onClick={() => f.action({ id: 'open-utils', infrPath: f.infrPath })} className={FS_BTN}>
              <FolderOpen className="w-3.5 h-3.5" /> Abrir a pasta
            </button>
          </FileLine>
          <FileLine ok={!!files?.dumps.length} name="Dump do banco (.dmp)" where={files?.dumps.length ? `/opt/dumps · ${files.dumps.join(', ')}` : '/opt/dumps · o Oracle importa dele'}>
            <button type="button" onClick={() => f.openFolder('dumps')} className={FS_BTN}>
              <FolderOpen className="w-3.5 h-3.5" /> Abrir a pasta
            </button>
          </FileLine>
          <FileLine ok={!!files?.winthorIni} name="Winthor.ini" where="/opt · o WSH lê o banco dele">
            <button type="button" onClick={() => f.openFolder('opt')} className={FS_BTN}>
              <FolderOpen className="w-3.5 h-3.5" /> Abrir a pasta
            </button>
          </FileLine>
          <FileLine ok={!!files?.wshJars.length} name="Jar do WSH" where={files?.wshJars.length ? `/opt · ${files.wshJars.join(', ')}` : '/opt · winthor-integracao-core.jar'}>
            <button type="button" onClick={() => f.openFolder('opt')} className={FS_BTN}>
              <FolderOpen className="w-3.5 h-3.5" /> Abrir a pasta
            </button>
          </FileLine>
          <button type="button" onClick={() => f.openUrl(INFR_TEAM_DRIVE_URL)} className={FS_BTN}>
            <ExternalLink className="w-3.5 h-3.5" /> Abrir o Drive do time
          </button>
        </>
      );
    }
    case 'env':
      return <InfrFirstStepsEnv f={f} />;
    case 'wtaSetup': {
      const url = p?.wta?.url;
      if (!url) return null;
      return (
        <>
          <InfrCommandLine command={`${url}${WTA_INSTALLER_PATH}`} runLabel="Abrir o instalador" onRun={() => f.openUrl(`${url}${WTA_INSTALLER_PATH}`)} />
          <p className="text-2xs text-muted-foreground">
            No instalador: confira o banco ({firstStepsContainers(f.version).oracle}:1521/XE, com o usuário do schema importado), escolha empresa e loja e conclua. Quando o login
            entrar, este item fica verde e o WSH libera.
          </p>
        </>
      );
    }
    case 'ready': {
      const ports = winthorVersionPorts(f.version);
      const c = firstStepsContainers(f.version);
      return (
        <>
          <InfrCommandLine label="WinThor web" command={p?.wta?.url ?? `http://localhost:${ports.web}`} runLabel="Abrir" onRun={() => f.openUrl(p?.wta?.url ?? `http://localhost:${ports.web}`)} />
          <InfrCommandLine label="Banco (TNS)" command={`localhost:${ports.oracle}/XE`} />
          <InfrCommandLine label="Logs do WTA" command={`docker logs --tail 200 -f ${c.wta}`} />
          <p className="text-2xs text-muted-foreground">
            Os containers param quando o Windows desliga. Para voltar, use Subir WinThor na tela WinThor &amp; WSL. Outra versão: Nova versão, a partir deste ambiente.
          </p>
        </>
      );
    }
    default:
      return null;
  }
};
