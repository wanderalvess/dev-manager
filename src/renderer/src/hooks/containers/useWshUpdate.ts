import { useCallback, useEffect, useState } from 'react';
import type {
  WshInstallerListResult,
  WshUpdateApplyResult,
  WshUpdateInspectResult,
  WshUpdatePrepareResult,
  WshUpdateProbeResult,
  WshUpdateProgress
} from '../../../../shared/wshUpdate';
import { isValidWshVersion } from '../../../../shared/wshUpdate';
import { requestConfirm } from '../../components/ui/confirmService';
import { showToast } from '../../components/ToastHost';
import { applyConfirmation, canApplyUpdate, formatMegabytes } from '../../utils/wshUpdateView';

export type WshUpdateBusy = 'idle' | 'probing' | 'preparing' | 'applying' | 'rollingBack';

/** Estado da aba "Atualizar WSH": container em uso, versão (da lista, digitada ou de um arquivo), conferência e troca do jar. */
export function useWshUpdate(container: string, active: boolean) {
  const [info, setInfo] = useState<WshUpdateInspectResult | null>(null);
  const [installers, setInstallers] = useState<WshInstallerListResult | null>(null);
  const [version, setVersionState] = useState('');
  const [localFile, setLocalFile] = useState('');
  const [probe, setProbe] = useState<WshUpdateProbeResult | null>(null);
  const [prepared, setPrepared] = useState<WshUpdatePrepareResult | null>(null);
  const [result, setResult] = useState<WshUpdateApplyResult | null>(null);
  const [progress, setProgress] = useState<WshUpdateProgress | null>(null);
  const [busy, setBusy] = useState<WshUpdateBusy>('idle');
  const api = window.electronAPI;
  const available = !!api?.inspectWshUpdate;

  const load = useCallback(async () => {
    if (!api?.inspectWshUpdate) return;
    setInfo(await api.inspectWshUpdate({ container }));
  }, [api, container]);

  const loadInstallers = useCallback(async () => {
    if (!api?.listWshInstallers) return;
    setInstallers(null);
    setInstallers(await api.listWshInstallers());
  }, [api]);

  useEffect(() => {
    if (!active) return;
    void load();
    void loadInstallers();
  }, [active, load, loadInstallers]);

  useEffect(() => api?.onWshUpdateProgress?.(setProgress), [api]);

  // Mudar a escolha (versão ou arquivo) descarta a consulta e o jar preparados antes
  const resetChoice = () => {
    setProbe(null);
    setPrepared(null);
    setResult(null);
  };

  const setVersion = (value: string) => {
    setVersionState(value);
    setLocalFile('');
    resetChoice();
  };

  const pickFile = async () => {
    const file = await api?.selectFile?.({ filters: [{ name: 'Instalador ou jar do WSH', extensions: ['exe', 'jar'] }] });
    if (!file) return;
    setLocalFile(file);
    setVersionState('');
    resetChoice();
  };

  const clearFile = () => {
    setLocalFile('');
    resetChoice();
  };

  const check = async () => {
    if (!api?.probeWshInstaller || !isValidWshVersion(version)) return;
    setBusy('probing');
    setProbe(await api.probeWshInstaller(version.trim()));
    setBusy('idle');
  };

  const prepare = async () => {
    if (!api?.prepareWshUpdate) return;
    setBusy('preparing');
    setResult(null);
    setProgress(null);
    setPrepared(await api.prepareWshUpdate({ container, version: version.trim(), localFile: localFile || undefined }));
    setBusy('idle');
  };

  const apply = async () => {
    if (!api?.applyWshUpdate || !prepared?.version || !canApplyUpdate(prepared, false)) return;
    const { message, tone } = applyConfirmation(prepared, container, info?.version);
    if (!(await requestConfirm({ title: 'Atualizar o WSH?', message, tone, confirmLabel: 'Atualizar e reiniciar' }))) return;
    setBusy('applying');
    setProgress(null);
    const res = await api.applyWshUpdate({ container, version: prepared.version });
    setResult(res);
    setBusy('idle');
    showToast(res.success && res.started ? 'WSH atualizado e no ar.' : res.success ? 'Jar trocado, mas o WSH não confirmou a subida.' : res.error || 'Falha ao atualizar.', res.success && res.started ? 'success' : 'error');
    await load();
  };

  const rollback = async () => {
    if (!api?.rollbackWshUpdate || !info?.backups?.length) return;
    const backup = info.backups[0];
    if (!(await requestConfirm({ title: 'Voltar ao jar anterior?', message: `O jar atual será substituído por ${backup} e o container reiniciado.`, tone: 'warning', confirmLabel: 'Voltar e reiniciar' }))) return;
    setBusy('rollingBack');
    setProgress(null);
    const res = await api.rollbackWshUpdate({ container, backup });
    setResult(res);
    setBusy('idle');
    showToast(res.success && res.started ? 'Jar anterior restaurado e WSH no ar.' : res.error || 'Jar restaurado, mas o WSH não confirmou a subida.', res.success && res.started ? 'success' : 'error');
    await load();
  };

  const clearCache = async () => {
    if (!api?.clearWshUpdateCache) return;
    const res = await api.clearWshUpdateCache();
    if (res.success) {
      setPrepared(null);
      showToast(res.freedBytes ? `${formatMegabytes(res.freedBytes)} liberados (instaladores baixados).` : 'Não havia arquivos baixados.', 'success');
    } else {
      showToast(res.error || 'Não foi possível apagar os arquivos baixados.', 'error');
    }
  };

  return { available, info, installers, loadInstallers, version, setVersion, localFile, pickFile, clearFile, probe, prepared, result, progress, busy, load, check, prepare, apply, rollback, clearCache };
}
