import { useEffect, useState } from 'react';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { WSH_DEFAULT_PLAIN_PASS, type WshUtilsTab } from '../../utils/wshUtilsModalUtils';

export function useWshUtilsModalState(onLoadWshPrereqs: () => void, open = true, initialTab?: WshUtilsTab) {
  const [activeTab, setActiveTab] = useState<WshUtilsTab>(initialTab ?? 'md5');
  const [plainPass, setPlainPass] = useState<string>(WSH_DEFAULT_PLAIN_PASS);
  const [md5Upper, setMd5Upper] = useState<string>('');
  const [md5Lower, setMd5Lower] = useState<string>('');

  const { copy, copiedKey } = useCopyToClipboard();

  // O modal fica montado entre aberturas: cada abertura volta à aba pedida (ou ao MD5)
  useEffect(() => {
    if (open) setActiveTab(initialTab ?? 'md5');
  }, [open, initialTab]);

  // Geração reativa de hash MD5 para senhas WSH
  useEffect(() => {
    if (!plainPass) {
      setMd5Upper('');
      setMd5Lower('');
      return;
    }
    if (window.electronAPI?.generateMd5) {
      window.electronAPI.generateMd5(plainPass).then((res) => {
        if (res) {
          setMd5Upper(res.upper);
          setMd5Lower(res.lower);
        }
      });
    }
  }, [plainPass]);

  // Abrir a aba de arquivos dispara a verificação dos pré-requisitos
  const openFilesTab = () => {
    setActiveTab('files');
    onLoadWshPrereqs();
  };

  return {
    activeTab,
    setActiveTab,
    plainPass,
    setPlainPass,
    md5Upper,
    md5Lower,
    copy,
    copiedKey,
    openFilesTab
  };
}
