import { useState } from 'react';
import { useCopyToClipboard } from '../useCopyToClipboard';
import type { WtaUtilsTab } from '../../utils/wtaUtilsModalUtils';

export function useWtaUtilsModalState() {
  const [activeTab, setActiveTab] = useState<WtaUtilsTab>('access');
  const { copy, copiedKey } = useCopyToClipboard();

  return { activeTab, setActiveTab, copy, copiedKey };
}
