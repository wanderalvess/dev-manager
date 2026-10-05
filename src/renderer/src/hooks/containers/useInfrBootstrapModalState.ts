import { useState } from 'react';
import {
  INFR_DEFAULT_CUSTOM_PATH,
  INFR_DEFAULT_ORACLE_CONTAINER,
  INFR_DEFAULT_ORACLE_PORT,
  INFR_DEFAULT_WTA_CONTAINER,
  INFR_DEFAULT_WTA_PORT,
  type InfrBootstrapTab
} from '../../utils/infrBootstrapModalUtils';

type InfrScriptType = 'oracle' | 'wta' | 'wsh';

interface InfrRunOptions {
  customPath: string;
  oracleContainer: string;
  oraclePort: number;
  wtaContainer: string;
  wtaPort: number;
}

interface UseInfrBootstrapModalStateArgs {
  onLoadInfrScripts: (customPath?: string) => void;
  onRunInfrScript: (scriptType: InfrScriptType, options: InfrRunOptions) => void;
}

export function useInfrBootstrapModalState({
  onLoadInfrScripts,
  onRunInfrScript
}: UseInfrBootstrapModalStateArgs) {
  const [activeTab, setActiveTab] = useState<InfrBootstrapTab>('oracle');
  const [customPath, setCustomPath] = useState<string>(INFR_DEFAULT_CUSTOM_PATH);
  const [oracleContainer, setOracleContainer] = useState<string>(INFR_DEFAULT_ORACLE_CONTAINER);
  const [oraclePort, setOraclePort] = useState<number>(INFR_DEFAULT_ORACLE_PORT);
  const [wtaContainer, setWtaContainer] = useState<string>(INFR_DEFAULT_WTA_CONTAINER);
  const [wtaPort, setWtaPort] = useState<number>(INFR_DEFAULT_WTA_PORT);

  const handleRun = (type: InfrScriptType) => {
    onRunInfrScript(type, { customPath, oracleContainer, oraclePort, wtaContainer, wtaPort });
  };

  const openScriptsTab = () => {
    setActiveTab('scripts');
    onLoadInfrScripts(customPath);
  };

  return {
    activeTab,
    setActiveTab,
    customPath,
    setCustomPath,
    oracleContainer,
    setOracleContainer,
    oraclePort,
    setOraclePort,
    wtaContainer,
    setWtaContainer,
    wtaPort,
    setWtaPort,
    handleRun,
    openScriptsTab
  };
}
