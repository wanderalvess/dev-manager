import { useState } from 'react';
import type { TautCsvIntakeResult } from '../../../../../shared/types';
import { api } from '../../../services/apiBridge';
import { showToast } from '../../../components/ToastHost';

export function useTautIntake() {
  const [csvFileName, setCsvFileName] = useState<string>('Insumo/pedido.csv');
  const [processingIntake, setProcessingIntake] = useState<boolean>(false);
  const [intakeResult, setIntakeResult] = useState<TautCsvIntakeResult | null>(null);

  const handleProcessIntake = async () => {
    if (!csvFileName.trim()) return;
    setProcessingIntake(true);
    try {
      if (api.tautProcessIntake) {
        const res = await api.tautProcessIntake(csvFileName.trim());
        setIntakeResult(res);
        showToast(`Intake gerado para ${res.module} (${res.scenariosCount} cenários)!`, 'success');
      }
    } catch (err: any) {
      showToast(`Erro ao processar CSV: ${err.message}`, 'error');
    } finally {
      setProcessingIntake(false);
    }
  };

  return {
    csvFileName,
    setCsvFileName,
    processingIntake,
    intakeResult,
    handleProcessIntake
  };
}
