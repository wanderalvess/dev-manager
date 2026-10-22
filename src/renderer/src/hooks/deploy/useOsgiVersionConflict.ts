import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KarafBundleInfo, OsgiResolutionDiagnosticSummary } from '../../../../shared/types';
import {
  findConflictingBundles,
  osgiToMavenVersion,
  rankPomDependencies,
  type PomDependencyOption
} from '../../utils/osgiVersionConflictUtils';

interface PomCoordinatesLike {
  modules?: string[];
}

const joinPath = (base: string, child: string) => `${base.replace(/[\\/]+$/, '')}/${child}`;

/** Dependências do pom do projeto e dos módulos declarados nele (o pom que importa costuma estar no módulo -service). */
async function loadPomDependencies(projectPath: string): Promise<PomDependencyOption[]> {
  const api = window.electronAPI;
  if (!projectPath.trim() || !api?.listPomDependencies) return [];
  const coords = (await api.getPomCoordinates(projectPath)) as PomCoordinatesLike | null;
  const dirs = [projectPath, ...(coords?.modules ?? []).map((m) => joinPath(projectPath, m))];
  const lists = await Promise.all(
    dirs.map(async (dir) => {
      const deps = ((await api.listPomDependencies(dir)) ?? []) as Omit<PomDependencyOption, 'projectPath'>[];
      return deps.map((d) => ({ ...d, projectPath: dir }));
    })
  );
  return lists.flat();
}

/**
 * Detecta o módulo instalado no Karaf fora da faixa que o consumidor exige (tipicamente 0.0.1.SNAPSHOT contra
 * [1.39.0, 2.0.0)) e carrega as dependências do pom para o operador escolher qual alinhar.
 */
export function useOsgiVersionConflict(diagnostic: OsgiResolutionDiagnosticSummary, initialProjectPath: string) {
  const [conflicts, setConflicts] = useState<KarafBundleInfo[]>([]);
  const [bundleId, setBundleId] = useState('');
  const [isLoadingBundles, setIsLoadingBundles] = useState(true);
  const [projectPath, setProjectPath] = useState(initialProjectPath);
  const [deps, setDeps] = useState<PomDependencyOption[]>([]);
  const [depKey, setDepKey] = useState('');
  const [pomError, setPomError] = useState<string | null>(null);

  const isRangeKnown = diagnostic.requirementType === 'package' && !!(diagnostic.versionMin || diagnostic.versionMax);

  useEffect(() => {
    let cancelled = false;
    if (!isRangeKnown || !window.electronAPI?.listKarafBundles) {
      setIsLoadingBundles(false);
      return;
    }
    setIsLoadingBundles(true);
    window.electronAPI
      .listKarafBundles()
      .then((bundles) => {
        if (cancelled) return;
        const found = findConflictingBundles(bundles ?? [], diagnostic);
        setConflicts(found);
        setBundleId(found[0]?.id ?? '');
      })
      .catch(() => !cancelled && setConflicts([]))
      .finally(() => !cancelled && setIsLoadingBundles(false));
    return () => {
      cancelled = true;
    };
  }, [diagnostic, isRangeKnown]);

  const reloadPom = useCallback(async (path: string) => {
    setPomError(null);
    try {
      const list = await loadPomDependencies(path);
      setDeps(list);
      if (list.length === 0) setPomError('Nenhuma dependência encontrada. Confira a pasta do projeto (onde fica o pom.xml).');
    } catch (err: any) {
      setDeps([]);
      setPomError(err?.message || String(err));
    }
  }, []);

  useEffect(() => {
    if (conflicts.length > 0) void reloadPom(projectPath);
    // Recarrega só quando aparece um conflito; mudanças de pasta passam pelo botão "Carregar".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflicts.length]);

  const bundle = conflicts.find((b) => b.id === bundleId) ?? conflicts[0];
  const rankedDeps = useMemo(() => (bundle ? rankPomDependencies(deps, bundle) : deps), [deps, bundle]);
  const keyOf = (d: PomDependencyOption) => `${d.projectPath}|${d.groupId}|${d.artifactId}`;
  const dependency = rankedDeps.find((d) => keyOf(d) === depKey) ?? rankedDeps[0];

  return {
    isLoadingBundles,
    conflicts,
    bundle,
    setBundleId,
    projectPath,
    setProjectPath,
    reloadPom,
    rankedDeps,
    dependency,
    keyOf,
    setDepKey,
    pomError,
    suggestedVersion: bundle ? osgiToMavenVersion(bundle.version) : ''
  };
}
