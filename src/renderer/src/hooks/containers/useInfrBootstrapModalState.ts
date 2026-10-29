import { useState } from 'react';
import {
  INFR_DEFAULT_CUSTOM_PATH,
  INFR_DEFAULT_ORACLE_CONTAINER,
  INFR_DEFAULT_ORACLE_PORT,
  INFR_DEFAULT_WTA_CONTAINER,
  INFR_DEFAULT_WTA_PORT,
  type InfrBootstrapTab
} from '../../utils/infrBootstrapModalUtils';
import {
  isAutoVersionedName,
  isAutoWtaContainerName,
  isValidWinthorVersion,
  winthorVersionDefaults,
  winthorVersionOracleDefaults,
  winthorVersionPorts
} from '../../../../shared/infrWinthorVersion';

type InfrScriptType = 'oracle' | 'wta' | 'wsh';

interface InfrRunOptions {
  customPath: string;
  oracleContainer: string;
  oraclePort: number;
  wtaContainer: string;
  wtaPort: number;
  winthorVersion: string;
}

interface UseInfrBootstrapModalStateArgs {
  onLoadInfrScripts: (customPath?: string) => void;
  onRunInfrScript: (scriptType: InfrScriptType, options: InfrRunOptions) => void;
}

/** A porta ainda é a sugerida (padrão ou de outra versão): pode acompanhar a troca de versão. */
const isAutoPort = (port: number, defaultPort: number, previousVersion: string, kind: 'web' | 'oracle') =>
  port === defaultPort ||
  (isValidWinthorVersion(previousVersion) && port === winthorVersionPorts(previousVersion)[kind]);

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
  const [winthorVersion, setWinthorVersionState] = useState<string>('');

  /**
   * Troca a versão e, enquanto não foram personalizados, ajusta os nomes e portas da versão:
   * Oracle (oracle-38 na 1538, cada versão com o seu banco) e WTA (wta-38 na 8038).
   */
  const setWinthorVersion = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, 3);
    const valid = isValidWinthorVersion(next);
    if (isAutoWtaContainerName(wtaContainer, INFR_DEFAULT_WTA_CONTAINER)) {
      setWtaContainer(valid ? winthorVersionDefaults(next).container : INFR_DEFAULT_WTA_CONTAINER);
    }
    if (isAutoPort(wtaPort, INFR_DEFAULT_WTA_PORT, winthorVersion, 'web')) {
      setWtaPort(valid ? winthorVersionDefaults(next).port : INFR_DEFAULT_WTA_PORT);
    }
    if (isAutoVersionedName(oracleContainer, INFR_DEFAULT_ORACLE_CONTAINER, 'oracle')) {
      setOracleContainer(valid ? winthorVersionOracleDefaults(next).container : INFR_DEFAULT_ORACLE_CONTAINER);
    }
    if (isAutoPort(oraclePort, INFR_DEFAULT_ORACLE_PORT, winthorVersion, 'oracle')) {
      setOraclePort(valid ? winthorVersionOracleDefaults(next).port : INFR_DEFAULT_ORACLE_PORT);
    }
    setWinthorVersionState(next);
  };

  const handleRun = (type: InfrScriptType) => {
    onRunInfrScript(type, { customPath, oracleContainer, oraclePort, wtaContainer, wtaPort, winthorVersion });
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
    winthorVersion,
    setWinthorVersion,
    handleRun,
    openScriptsTab
  };
}
