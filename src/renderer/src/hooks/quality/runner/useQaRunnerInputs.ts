import { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppSettings, QaRegressionTemplate } from '../../../../../shared/types';
import { api } from '../../../services/apiBridge';
import { showToast } from '../../../components/ToastHost';
import { autoExtractVariablesFromJson } from '../../../utils/qaRegressionRendererUtils';
import { exportTemplateAsJsonFile } from '../../../utils/qaTemplateExportUtils';
import { buildDefaultVariables, pickDefaultConnectionId } from '../../../utils/qaRunnerUtils';

export function useQaRunnerInputs(settings: AppSettings | null) {
  const [templates, setTemplates] = useState<QaRegressionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [rawJson, setRawJson] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  const dbConnections = useMemo(() => {
    return settings?.databaseConnections || [];
  }, [settings]);

  const oracleConnections = useMemo(() => {
    return dbConnections.filter((c) => c.type === 'oracle');
  }, [dbConnections]);

  const loadTemplates = useCallback(async () => {
    try {
      if (api?.qaListTemplates) {
        const list = await api.qaListTemplates();
        setTemplates(list);
        if (list.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(list[0].id);
        }
      }
    } catch (err: any) {
      console.warn('Falha ao listar templates de regressivo:', err);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  useEffect(() => {
    if (!selectedConnectionId) {
      const id = pickDefaultConnectionId(oracleConnections, dbConnections);
      if (id) setSelectedConnectionId(id);
    }
  }, [oracleConnections, dbConnections, selectedConnectionId]);

  useEffect(() => {
    if (selectedTemplate) {
      setVariables(buildDefaultVariables(selectedTemplate));

      if (selectedTemplate.sampleJson) {
        setRawJson((prev) => prev || selectedTemplate.sampleJson || '');
      }
    }
  }, [selectedTemplate]);

  const handleAutoExtractVariables = () => {
    if (!rawJson.trim()) {
      showToast('Cole primeiro o payload JSON da API ou PDV.', 'info');
      return;
    }
    const detected = autoExtractVariablesFromJson(rawJson);
    const keysCount = Object.keys(detected).length;
    if (keysCount > 0) {
      setVariables((prev) => ({ ...prev, ...detected }));
      showToast(`${keysCount} variáveis mapeadas automaticamente do JSON!`, 'success');
    } else {
      showToast('Nenhum parâmetro conhecido foi encontrado no JSON informado.', 'info');
    }
  };

  const handleLoadSampleJson = () => {
    if (selectedTemplate?.sampleJson) {
      setRawJson(selectedTemplate.sampleJson);
      const detected = autoExtractVariablesFromJson(selectedTemplate.sampleJson);
      setVariables((prev) => ({ ...prev, ...detected }));
      showToast('Payload JSON de exemplo carregado!', 'success');
    } else {
      showToast('Este template não possui JSON de exemplo configurado.', 'info');
    }
  };

  const handleSelectIncomingPayload = (json: string) => {
    setRawJson(json);
    const detected = autoExtractVariablesFromJson(json);
    const keysCount = Object.keys(detected).length;
    if (keysCount > 0) {
      setVariables((prev) => ({ ...prev, ...detected }));
      showToast(`${keysCount} variáveis mapeadas automaticamente do JSON!`, 'success');
    }
  };

  const handleExportCurrentTemplate = useCallback(() => {
    if (!selectedTemplate) {
      showToast('Selecione um cenário de teste para exportar.', 'info');
      return;
    }
    exportTemplateAsJsonFile(selectedTemplate);
    showToast(`Template "${selectedTemplate.name}" exportado com sucesso!`, 'success');
  }, [selectedTemplate]);

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedTemplate,
    selectedConnectionId,
    setSelectedConnectionId,
    dbConnections,
    rawJson,
    setRawJson,
    variables,
    setVariables,
    handleAutoExtractVariables,
    handleLoadSampleJson,
    handleSelectIncomingPayload,
    handleExportCurrentTemplate
  };
}
