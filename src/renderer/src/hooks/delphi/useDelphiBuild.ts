import { useCallback, useEffect, useState } from 'react';
import type {
  DelphiBuildResult,
  DelphiInstallation,
  DelphiPipelineResult,
  DelphiProject
} from '../../../../shared/types';
import {
  DELPHI_FORM_STORAGE_KEY,
  DelphiFormState,
  appendDelphiLog,
  loadDelphiForm
} from '../../utils/delphiBuildView';

function readStoredForm(): DelphiFormState {
  try {
    return loadDelphiForm(window.localStorage.getItem(DELPHI_FORM_STORAGE_KEY));
  } catch {
    return loadDelphiForm(null);
  }
}

/** Estado e ações do modal de Build Delphi: detecção da IDE, projetos, formulário, execução e log. */
export function useDelphiBuild(open: boolean) {
  const [installations, setInstallations] = useState<DelphiInstallation[]>([]);
  const [projects, setProjects] = useState<DelphiProject[]>([]);
  const [form, setForm] = useState<DelphiFormState>(readStoredForm);
  const [log, setLog] = useState('');
  const [running, setRunning] = useState(false);
  const [build, setBuild] = useState<DelphiBuildResult | null>(null);
  const [pipeline, setPipeline] = useState<DelphiPipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateForm = useCallback((patch: Partial<DelphiFormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(DELPHI_FORM_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* armazenamento indisponível: o formulário só não é lembrado */
      }
      return next;
    });
  }, []);

  const reloadAll = useCallback(async () => {
    const api = window.electronAPI;
    const [found, list] = await Promise.all([api.delphiDetectInstallations(), api.delphiFindProjects()]);
    setInstallations(found);
    setProjects(list);
    setForm((prev) => (prev.rsvarsPath || !found[0] ? prev : { ...prev, rsvarsPath: found[0].rsvarsPath }));
  }, []);

  const reload = useCallback(
    () => reloadAll().catch((err) => setError(err instanceof Error ? err.message : String(err))),
    [reloadAll]
  );

  useEffect(() => {
    if (!open) return undefined;
    void reload();
    return window.electronAPI.onDelphiLogChunk((chunk) => setLog((prev) => appendDelphiLog(prev, chunk)));
  }, [open, reload]);

  const execute = useCallback(async (action: () => Promise<void>) => {
    setRunning(true);
    setError(null);
    setBuild(null);
    setPipeline(null);
    setLog('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, []);

  const runBuild = useCallback(
    () =>
      execute(async () => {
        const { dprojPath, rsvarsPath, config, platform } = form;
        setBuild(await window.electronAPI.delphiBuild({ dprojPath, rsvarsPath, config, platform }));
      }),
    [execute, form]
  );

  const runPipeline = useCallback(
    () =>
      execute(async () => {
        const { dprojPath, rsvarsPath, config, platform, killRunning, publishDir, launch } = form;
        const result = await window.electronAPI.delphiRunPipeline({
          dprojPath,
          rsvarsPath,
          config,
          platform,
          killRunning,
          publishDir: publishDir.trim() || undefined,
          launch
        });
        setPipeline(result);
        setBuild(result.build ?? null);
      }),
    [execute, form]
  );

  const cancel = useCallback(() => window.electronAPI.delphiCancelBuild(), []);

  return { installations, projects, form, updateForm, log, running, build, pipeline, error, runBuild, runPipeline, cancel, reload };
}
