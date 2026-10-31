import React from 'react';
import { Activity, CheckCircle2, Circle, FilePlus2, FileText, Play } from 'lucide-react';
import { dumpImportCommand, dumpImportError, firstStepsContainers, infrEnvFiles } from '../../../../../../shared/infrFirstStepsCommands';
import type { InfrFirstStepsState } from '../../../../hooks/containers/useInfrFirstSteps';
import { InfrCommandLine } from '../InfrCommandLine';
import { FS_BTN, FS_INPUT } from './InfrFirstStepRow';

const Part: React.FC<{ done: boolean; title: string; detail: string; children?: React.ReactNode }> = ({ done, title, detail, children }) => (
  <div className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3 border-t border-border/60 first:border-t-0">
    {done ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" /> : <Circle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />}
    <div className="flex-1 min-w-[16rem]">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="text-2xs text-muted-foreground mt-0.5 leading-snug">{detail}</p>
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

const stateText = (s?: string) => (s ? (s === 'running' ? 'no ar' : s) : 'ainda não criado');

/** Item 6: banco, dump, arquivos de configuração, WTA e WSH da versão, na ordem em que dependem um do outro. */
export const InfrFirstStepsEnv: React.FC<{ f: InfrFirstStepsState }> = ({ f }) => {
  const p = f.result?.probe;
  const v = f.version;
  const c = firstStepsContainers(v);
  const s = p?.containers ?? {};
  const files = infrEnvFiles(v);
  const env = p?.envFiles ?? { wta: false, wsh: false };
  const dumps = p?.files?.dumps ?? [];
  const dumpInput = { version: v, ...f.dump };
  const dumpError = dumpImportError(dumpInput);
  const wtaReady = f.result?.steps.find((x) => x.id === 'wtaSetup')?.status === 'ok';
  const envButtons = (which: 'wta' | 'wsh', exists: boolean) =>
    exists ? (
      <button type="button" onClick={() => f.action({ id: 'open-env', infrPath: f.infrPath, version: v, which })} className={FS_BTN}>
        <FileText className="w-3.5 h-3.5" /> Abrir
      </button>
    ) : (
      <button type="button" onClick={() => f.action({ id: 'create-env', infrPath: f.infrPath, version: v, which })} className={FS_BTN}>
        <FilePlus2 className="w-3.5 h-3.5" /> Criar do modelo
      </button>
    );

  return (
    <div>
      <Part done={s.oracle === 'running'} title={`1. Banco: ${c.oracle}`} detail={`Oracle XE do INFR-Docker, ${stateText(s.oracle)}. O listener leva uns 2 minutos depois de criado.`}>
        <button type="button" onClick={() => f.runSetup('oracle')} disabled={!!s.oracle} className={FS_BTN}>
          <Play className="w-3.5 h-3.5" /> Subir o banco
        </button>
      </Part>

      <Part done={false} title="2. Importar o dump" detail="Roda o import_dump.sh no container. A senha do system é pedida no terminal e não passa pelo Hub. O Hub não confere se o dump já entrou: veja o fim do import no terminal.">
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select aria-label="Arquivo do dump em /opt/dumps" value={f.dump.file} onChange={(e) => f.setDump({ ...f.dump, file: e.target.value })} className={FS_INPUT}>
            <option value="">{dumps.length ? 'Escolha o .dmp' : 'Nenhum .dmp em /opt/dumps'}</option>
            {dumps.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input aria-label="Schema" value={f.dump.schema} onChange={(e) => f.setDump({ ...f.dump, schema: e.target.value })} placeholder="Schema" className={FS_INPUT} />
          <input aria-label="codclipc" value={f.dump.codclipc} onChange={(e) => f.setDump({ ...f.dump, codclipc: e.target.value })} placeholder="codclipc" inputMode="numeric" className={FS_INPUT} />
        </div>
        {dumpError ? (
          <p className="w-full text-2xs text-muted-foreground">{s.oracle !== 'running' ? 'Suba o banco antes. ' : ''}{dumpError}</p>
        ) : (
          <div className="w-full">
            <InfrCommandLine
              command={dumpImportCommand(dumpInput)}
              runLabel="Importar no terminal"
              onRun={s.oracle === 'running' ? () => f.action({ id: 'import-dump', distro: f.distro, dump: dumpInput }) : undefined}
            />
          </div>
        )}
      </Part>

      <Part done={env.wta && env.wsh} title="3. Configuração do WTA e do WSH" detail={`${files.wta} e ${files.wsh}: o Hub cria a partir dos modelos com os nomes e portas da versão; você preenche usuário, senha, loja e empresa.`}>
        <span className="text-2xs text-foreground/80">WTA</span>
        {envButtons('wta', env.wta)}
        <span className="text-2xs text-foreground/80 ml-2">WSH</span>
        {envButtons('wsh', env.wsh)}
      </Part>

      <Part done={s.wta === 'running'} title={`4. WTA: ${c.wta}`} detail={`${stateText(s.wta)}. Na primeira vez monta a imagem linux-winthor:${v} pelo Nexus (alguns minutos); um 401 no build é falta de acesso ao Nexus.`}>
        <button type="button" onClick={() => f.runSetup('wta')} disabled={!env.wta || !!s.wta} title={env.wta ? undefined : `Crie o ${files.wta} antes`} className={FS_BTN}>
          <Play className="w-3.5 h-3.5" /> Subir o WTA
        </button>
      </Part>

      <Part done={s.wsh === 'running'} title={`5. WSH: ${c.wsh}`} detail={`${stateText(s.wsh)}. Sobe depois da configuração inicial do WTA (item 7): antes dela o WSH não consegue validar as features.`}>
        <button type="button" onClick={() => f.runSetup('wsh')} disabled={!env.wsh || !wtaReady || !!s.wsh} className={FS_BTN}>
          <Play className="w-3.5 h-3.5" /> Subir o WSH
        </button>
        <button type="button" onClick={f.verify} className={FS_BTN}>
          <Activity className="w-3.5 h-3.5" /> Verificar ambiente
        </button>
      </Part>
    </div>
  );
};
