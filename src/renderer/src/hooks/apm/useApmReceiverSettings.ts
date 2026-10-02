import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_APM_SERVICE_NAME, isValidApmReceiverPort } from '../../../../shared/types';
import { api } from '../../services/apiBridge';
import { showToast } from '../../components/ToastHost';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && error.message) {
    return String(error.message);
  }
  return String(error);
}

export function useApmReceiverSettings({
  isActive,
  onRefresh
}: {
  isActive: boolean;
  onRefresh: () => void;
}) {
  const [serviceName, setServiceName] = useState(DEFAULT_APM_SERVICE_NAME);
  const [instrumentationEnabled, setInstrumentationEnabled] = useState(false);
  const [isSavingServiceName, setIsSavingServiceName] = useState(false);
  const [isSavingInstrumentation, setIsSavingInstrumentation] = useState(false);
  const [isChangingPort, setIsChangingPort] = useState(false);

  useEffect(() => {
    if (!isActive || !api?.getSettings) return;
    api.getSettings().then((settings) => {
      setServiceName(settings.apmServiceName?.trim() || DEFAULT_APM_SERVICE_NAME);
      setInstrumentationEnabled(!!settings.apmInstrumentationEnabled);
    }).catch((err) => console.warn('[ApmPage] Falha ao carregar as configurações do APM:', err));
  }, [isActive]);

  const applyServiceName = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      showToast('Informe um nome de serviço.', 'error');
      return;
    }
    if (!api?.saveSettings) return;
    setIsSavingServiceName(true);
    try {
      await api.saveSettings({ apmServiceName: trimmed });
      setServiceName(trimmed);
      showToast('Nome de serviço salvo. O próximo start do Karaf já exporta com esse nome.', 'success');
    } catch (err) {
      showToast(`Falha ao salvar o nome de serviço: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsSavingServiceName(false);
    }
  }, []);

  const toggleInstrumentation = useCallback(async (next: boolean) => {
    if (!api?.saveSettings) return;
    setIsSavingInstrumentation(true);
    try {
      await api.saveSettings({ apmInstrumentationEnabled: next });
      setInstrumentationEnabled(next);
      showToast(
        next
          ? 'Instrumentação automática ligada. O próximo start do Karaf pelo Cockpit já anexa o agente.'
          : 'Instrumentação automática desligada. O Karaf volta a subir sem o agente OpenTelemetry.',
        'success'
      );
    } catch (err) {
      showToast(`Falha ao salvar a configuração: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsSavingInstrumentation(false);
    }
  }, []);

  const changeReceiverPort = useCallback(async (portDraft: string) => {
    const port = Number(portDraft);
    if (!isValidApmReceiverPort(port)) {
      showToast('Informe uma porta inteira entre 1024 e 65535.', 'error');
      return;
    }
    if (!api?.changeApmReceiverPort) return;
    setIsChangingPort(true);
    try {
      const result = await api.changeApmReceiverPort(port);
      if (result.success) {
        showToast(`Receptor OTLP escutando na porta ${result.status.port}.`, 'success');
      } else {
        const fallback = result.status.listening ? ` Receptor mantido na porta ${result.status.port}.` : '';
        showToast(`Não foi possível usar a porta ${port}: ${result.error}.${fallback}`, 'error');
      }
      onRefresh();
      return result;
    } catch (err) {
      showToast(`Falha ao trocar a porta do receptor: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsChangingPort(false);
    }
  }, [onRefresh]);

  return {
    serviceName,
    instrumentationEnabled,
    isSavingServiceName,
    isSavingInstrumentation,
    isChangingPort,
    handleApplyServiceName: applyServiceName,
    handleToggleInstrumentation: toggleInstrumentation,
    handleApplyReceiverPort: changeReceiverPort
  };
}
