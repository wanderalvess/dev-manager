import { useCallback, useEffect, useState } from 'react';
import type {
  WshUpdateApplyResult,
  WshUpdateInspectResult,
  WshUpdatePrepareResult,
  WshUpdateProbeResult,
  WshUpdateProgress
} from '../../../../shared/wshUpdate';
import { isValidWshVersion } from '../../../../shared/wshUpdate';
import { requestConfirm } from '../../components/ui/confirmService';
import { showToast } from '../../components/ToastHost';
import { applyConfirmation, canApplyUpdate } from '../../utils/wshUpdateView';

export type WshUpdateBusy = 'idle' | 'probing' | 'preparing' | 'applying' | 'rollingBack';

/** Estado da aba "Atualizar WSH": container em uso, versão nova, conferência e troca do jar. */
export function useWshUpdate(container: string, active: boolean) {
  const [info, setInfo] = useState<WshUpdateInspectResult | null>(null);
  const [version, setVersionState] = useState('');
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

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  useEffect(() => api?.onWshUpdateProgress?.(setProgress), [api]);

  // Mudar a versão digitada invalida a consulta e a preparação anteriores
  const setVersion = (value: string) => {
    setVersionState(value);
    setProbe(null);
    setPrepared(null);
    setResult(null);
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
    setPrepared(await api.prepareWshUpdate({ container, version: version.trim() }));
    setBusy('idle');
  };

  const apply = async () => {
    if (!api?.applyWshUpdate || !prepared || !canApplyUpdate(prepared, version, false)) return;
    const { message, tone } = applyConfirmation(prepared, container, info?.version);
    if (!(await requestConfirm({ title: 'Atualizar o WSH?', message, tone, confirmLabel: 'Atualizar e reiniciar' }))) return;
    setBusy('applying');
    setProgress(null);
    const res = await api.applyWshUpdate({ container, version: version.trim() });
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

  return { available, info, version, setVersion, probe, prepared, result, progress, busy, load, check, prepare, apply, rollback };
}
