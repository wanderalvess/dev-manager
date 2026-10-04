import { useState, Dispatch, SetStateAction } from 'react';
import { RoutineItem, KarafWtaStatusResult } from '../../../../shared/types';
import { LaunchFeedback, buildKarafOfflineStatus } from '../../utils/routinesPageUtils';

export function useRoutineLaunch(setKarafStatus: Dispatch<SetStateAction<KarafWtaStatusResult | null>>) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [launchFeedback, setLaunchFeedback] = useState<LaunchFeedback | null>(null);

  const handleLaunchRoutine = async (routine: RoutineItem, forceDirect = false) => {
    setRunningId(routine.id);
    setLaunchFeedback(null);
    try {
      if (window.electronAPI) {
        console.log(`[RoutinesPage] Chamando launchRoutine para: ${routine.fullPath} (forceDirect: ${forceDirect})`);
        const result = await window.electronAPI.launchRoutine(routine.fullPath, forceDirect);
        console.log(`[RoutinesPage] Resultado da abertura:`, result);
        if (!result.success) {
          setLaunchFeedback({
            id: routine.id,
            routine,
            success: false,
            message: result.message || 'Não foi possível iniciar a rotina.',
            karafOffline: result.karafOffline,
            authFailed: result.authFailed,
            winthorStartOffline: result.winthorStartOffline
          });
          if (result.karafOffline) {
            setKarafStatus((prev) => buildKarafOfflineStatus(prev, result.message));
          }
        } else if (!result.fallbackDirect) {
          // Em caso de sucesso pelo WinThor Start, sabemos que o Karaf está online
          setKarafStatus((prev) => (prev ? { ...prev, online: true } : null));
        }
      }
    } catch (err: any) {
      console.error(`[RoutinesPage] Erro ao disparar rotina:`, err);
      setLaunchFeedback({
        id: routine.id,
        routine,
        success: false,
        message: err?.message || 'Erro inesperado ao iniciar a rotina.'
      });
    } finally {
      setTimeout(() => setRunningId(null), 1500);
    }
  };

  return { runningId, launchFeedback, setLaunchFeedback, handleLaunchRoutine };
}
