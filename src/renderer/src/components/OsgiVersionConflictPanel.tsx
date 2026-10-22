import React, { useState } from 'react';
import { BookOpen, FileEdit, GitCompare, ListTree, Play } from 'lucide-react';
import type { OsgiResolutionDiagnosticSummary } from '../../../shared/types';
import { useOsgiVersionConflict } from '../hooks/deploy/useOsgiVersionConflict';
import { useKarafConsole } from '../hooks/karafConsole/KarafConsoleContext';
import { recordAlteredPom } from '../hooks/deploy/useAlteredPoms';
import { requestConfirm } from './ui/confirmService';
import { showToast } from './ToastHost';

interface OsgiVersionConflictPanelProps {
  diagnostic: OsgiResolutionDiagnosticSummary;
  /** Pasta do projeto que estava sendo instalado quando a etapa falhou (onde fica o pom que importa o pacote). */
  contextProjectPath: string;
  disabled?: boolean;
  onRunActiveProfile?: () => void;
  onOpenBundles?: () => void;
  onOpenCatalog?: () => void;
}

interface PomUpdateOutcome {
  success: boolean;
  targetPomPath: string;
  oldVersion?: string;
  previousValue?: string;
  backupPath?: string;
  viaProperty?: string;
  error?: string;
}

const field =
  'px-2 py-1 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-hidden focus:border-primary transition';
const secondaryBtn =
  'px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition';

/**
 * Divergência entre o que está instalado (ex.: 0.0.1.SNAPSHOT de uma branch de desenvolvimento) e a faixa que o
 * consumidor exige. O operador escolhe: alinhar o pom ao instalado ou trocar o instalado por uma release.
 * Nada é alterado sem confirmação, e o pom ganha um .bak.
 */
export const OsgiVersionConflictPanel: React.FC<OsgiVersionConflictPanelProps> = ({
  diagnostic,
  contextProjectPath,
  disabled,
  onRunActiveProfile,
  onOpenBundles,
  onOpenCatalog
}) => {
  const conflict = useOsgiVersionConflict(diagnostic, contextProjectPath);
  const { setLogs } = useKarafConsole();
  const [newVersion, setNewVersion] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const { bundle, dependency } = conflict;
  if (conflict.isLoadingBundles || !bundle) return null;

  const targetVersion = newVersion || conflict.suggestedVersion;
  const canApply = !!dependency && !!targetVersion.trim() && !disabled && !isApplying;

  const applyPomChange = async (thenRunProfile: boolean) => {
    if (!dependency) return;
    const confirmed = await requestConfirm({
      title: 'Alterar o pom.xml?',
      message:
        `O consumidor exige ${diagnostic.versionRangeDesc ?? 'outra versão'}, mas o Karaf tem ${bundle.version} instalado ` +
        `(versão de desenvolvimento). Para alinhar, o pom.xml passará a depender de "${dependency.artifactId}" em ${targetVersion}.\n\n` +
        'Isso faz o projeto compilar contra a versão instalada. Será gerado um pom.xml.bak ao lado do arquivo. ' +
        'Não esqueça de reverter a versão antes de commitar, se ela for só para teste local.' +
        (thenRunProfile ? '\n\nDepois da alteração, o perfil atual será executado (clean install, repositório e instalação).' : ''),
      details: `${dependency.projectPath}/pom.xml\n${dependency.artifactId}: ${dependency.version || '(sem versão)'} → ${targetVersion}`,
      confirmLabel: thenRunProfile ? 'Alterar e executar perfil' : 'Alterar pom',
      tone: 'warning'
    });
    if (!confirmed) return;

    setIsApplying(true);
    try {
      const res = (await window.electronAPI.updatePomDependencyVersion(
        dependency.projectPath,
        { artifactId: dependency.artifactId, groupId: dependency.groupId || undefined, newVersion: targetVersion.trim() },
        true
      )) as PomUpdateOutcome;
      if (!res.success) {
        showToast(res.error || 'Não foi possível alterar o pom.xml.', 'error');
        return;
      }
      recordAlteredPom({
        pomPath: res.targetPomPath,
        projectPath: dependency.projectPath,
        groupId: dependency.groupId || undefined,
        artifactId: dependency.artifactId,
        from: res.oldVersion ?? dependency.version,
        to: targetVersion.trim(),
        previousValue: res.previousValue,
        viaProperty: res.viaProperty,
        backupPath: res.backupPath
      });
      const where = res.viaProperty ? ` (propriedade ${res.viaProperty})` : '';
      setLogs((prev) => [
        ...prev,
        `[INFO] pom.xml alterado: ${dependency.artifactId} ${res.oldVersion ?? '?'} → ${targetVersion.trim()}${where}\r\n`,
        `[INFO] Arquivo: ${res.targetPomPath}${res.backupPath ? ` (backup: ${res.backupPath})` : ''}\r\n`,
        `[ALERTA] Esta alteração do pom.xml é só para teste local: NÃO COMMITE. Reverta antes de enviar o código.\r\n`
      ]);
      showToast('pom.xml alterado só para teste local: NÃO commite esta alteração.', 'info');
      if (thenRunProfile) onRunActiveProfile?.();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="rounded-lg border border-info/40 bg-info/5 p-3 space-y-3 text-xs" data-testid="osgi-version-conflict">
      <div className="flex items-start gap-2">
        <GitCompare className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-foreground">Versão instalada diverge da exigida</p>
          <p className="text-foreground/90 leading-relaxed">
            O Karaf tem{' '}
            <strong className="font-mono">{bundle.symbolicName || bundle.name}</strong> na versão{' '}
            <strong className="font-mono text-warning">{bundle.version}</strong> (bundle {bundle.id}), mas o consumidor exige{' '}
            <strong className="font-mono">{diagnostic.versionRangeDesc}</strong>. É o caso típico de uma branch de desenvolvimento
            instalada no lugar da release. Escolha como resolver:
          </p>
          {conflict.conflicts.length > 1 && (
            <select value={bundle.id} onChange={(e) => conflict.setBundleId(e.target.value)} className={field} aria-label="Bundle instalado">
              {conflict.conflicts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} · {b.name} · {b.version}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-border bg-card p-2.5 space-y-2">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <FileEdit className="w-3.5 h-3.5 text-primary" /> 1. Alinhar o pom ao que está instalado
          </p>
          <p className="text-muted-foreground leading-snug">
            Use quando você está desenvolvendo este módulo. O pom do projeto passa a apontar para a versão instalada; depois é
            preciso rodar clean install, adicionar o repositório e instalar de novo.
          </p>
          <div className="flex gap-1.5">
            <input
              value={conflict.projectPath}
              onChange={(e) => conflict.setProjectPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void conflict.reloadPom(conflict.projectPath)}
              placeholder="Pasta do projeto (onde está o pom.xml)"
              aria-label="Pasta do projeto"
              className={`${field} flex-1 min-w-0`}
            />
            <button type="button" onClick={() => void conflict.reloadPom(conflict.projectPath)} className={secondaryBtn}>
              Carregar
            </button>
          </div>
          {conflict.pomError ? (
            <p className="text-warning">{conflict.pomError}</p>
          ) : (
            <select
              value={dependency ? conflict.keyOf(dependency) : ''}
              onChange={(e) => conflict.setDepKey(e.target.value)}
              className={`${field} w-full`}
              aria-label="Dependência a alterar"
            >
              {conflict.rankedDeps.map((d) => (
                <option key={conflict.keyOf(d)} value={conflict.keyOf(d)}>
                  {d.artifactId} · {d.version || 'sem versão'}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-2 text-muted-foreground">
            Nova versão
            <input value={targetVersion} onChange={(e) => setNewVersion(e.target.value)} className={`${field} flex-1`} />
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" disabled={!canApply} onClick={() => void applyPomChange(false)} className={secondaryBtn}>
              <FileEdit className="w-3.5 h-3.5 text-primary" /> Alterar pom
            </button>
            {onRunActiveProfile && (
              <button
                type="button"
                disabled={!canApply}
                onClick={() => void applyPomChange(true)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
              >
                <Play className="w-3 h-3 fill-current" /> Alterar e executar perfil
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-2.5 space-y-2">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" /> 2. Trocar por uma release compatível
          </p>
          <p className="text-muted-foreground leading-snug">
            Desinstale a versão de desenvolvimento (bundle {bundle.id}) e instale uma release dentro de{' '}
            <span className="font-mono">{diagnostic.versionRangeDesc}</span>, buscando no Catálogo 801. O pom do consumidor fica como está.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {onOpenBundles && (
              <button type="button" disabled={disabled} onClick={onOpenBundles} className={secondaryBtn}>
                <ListTree className="w-3.5 h-3.5 text-primary" /> Bundles OSGi (desinstalar)
              </button>
            )}
            {onOpenCatalog && (
              <button type="button" disabled={disabled} onClick={onOpenCatalog} className={secondaryBtn}>
                <BookOpen className="w-3.5 h-3.5 text-primary" /> Catálogo 801 (buscar release)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
