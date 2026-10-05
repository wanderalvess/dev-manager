import { useMemo, useState } from 'react';
import type { Routine801Feature, Routine801RepositoryUpdate } from '../../../../shared/types';
import { buildKarafInstallCommandsUi, findRepositoryForFeatureUi } from '../../utils/routine801UiUtils';
import { resolveEffectiveFeature } from '../../utils/routine801ModalUtils';

export const useRoutine801Inspector = (repositorios: Routine801RepositoryUpdate[]) => {
  const [inspectedFeature, setInspectedFeature] = useState<Routine801Feature | null>(null);
  const [inspectedCustomVersion, setInspectedCustomVersion] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleInspectFeature = (item: Routine801Feature) => {
    setInspectedFeature(item);
    setInspectedCustomVersion(item.versao || '');
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  // Feature sob inspeção com a versão editada pelo usuário
  const inspectedEffectiveFeature = useMemo(
    () => resolveEffectiveFeature(inspectedFeature, inspectedCustomVersion),
    [inspectedFeature, inspectedCustomVersion]
  );

  const inspectedRepo = useMemo(() => {
    if (!inspectedEffectiveFeature) return null;
    return findRepositoryForFeatureUi(inspectedEffectiveFeature, repositorios);
  }, [inspectedEffectiveFeature, repositorios]);

  const inspectedCommands = useMemo(() => {
    if (!inspectedEffectiveFeature) return null;
    return buildKarafInstallCommandsUi(inspectedEffectiveFeature, inspectedRepo, true);
  }, [inspectedEffectiveFeature, inspectedRepo]);

  return {
    inspectedFeature,
    setInspectedFeature,
    inspectedCustomVersion,
    setInspectedCustomVersion,
    copiedKey,
    handleInspectFeature,
    handleCopyText,
    inspectedEffectiveFeature,
    inspectedRepo,
    inspectedCommands
  };
};
