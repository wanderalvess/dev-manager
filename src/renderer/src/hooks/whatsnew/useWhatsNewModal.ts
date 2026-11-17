import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { parseChangelogVersions, ChangelogVersion } from '../../utils/changelogUtils';
import {
  WHATS_NEW_ALL_VERSIONS,
  filterWhatsNewVersions,
  resolveWhatsNewDefaultVersion
} from '../../utils/whatsNewModalUtils';

interface UseWhatsNewModalParams {
  isOpen: boolean;
  changelogContent: string;
  currentAppVersion?: string;
  initialVersion?: string;
}

export function useWhatsNewModal({
  isOpen,
  changelogContent,
  currentAppVersion,
  initialVersion
}: UseWhatsNewModalParams) {
  const parsedVersions = useMemo<ChangelogVersion[]>(() => {
    return parseChangelogVersions(changelogContent);
  }, [changelogContent]);

  const defaultVersion = useMemo(
    () => resolveWhatsNewDefaultVersion(parsedVersions, initialVersion, currentAppVersion),
    [initialVersion, currentAppVersion, parsedVersions]
  );

  const [selectedVersion, setSelectedVersion] = useState<string>(defaultVersion);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [dropdownSearch, setDropdownSearch] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincroniza versão padrão caso mude o conteúdo
  useEffect(() => {
    setSelectedVersion(defaultVersion);
  }, [defaultVersion]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const currentIndex = useMemo(() => {
    return parsedVersions.findIndex((v) => v.version === selectedVersion);
  }, [parsedVersions, selectedVersion]);

  const isAllVersions = selectedVersion === WHATS_NEW_ALL_VERSIONS;
  const isLatestVersion = currentIndex === 0;
  const latestVersion = parsedVersions[0]?.version;
  const currentVersionItem = currentIndex >= 0 ? parsedVersions[currentIndex] : null;

  // No array ordenado de versões (recente -> antiga):
  // Próximo índice (+1) = versão anterior/mais antiga
  // Índice anterior (-1) = versão seguinte/mais nova
  const hasOlderVersion = !isAllVersions && currentIndex >= 0 && currentIndex < parsedVersions.length - 1;
  const hasNewerVersion = !isAllVersions && currentIndex > 0;

  const goToOlderVersion = useCallback(() => {
    if (hasOlderVersion) {
      setSelectedVersion(parsedVersions[currentIndex + 1].version);
    }
  }, [hasOlderVersion, parsedVersions, currentIndex]);

  const goToNewerVersion = useCallback(() => {
    if (hasNewerVersion) {
      setSelectedVersion(parsedVersions[currentIndex - 1].version);
    }
  }, [hasNewerVersion, parsedVersions, currentIndex]);

  // Suporte a atalhos de teclado de navegação entre releases
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goToOlderVersion();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goToNewerVersion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToOlderVersion, goToNewerVersion]);

  const filteredVersions = useMemo(
    () => filterWhatsNewVersions(parsedVersions, dropdownSearch),
    [parsedVersions, dropdownSearch]
  );

  return {
    parsedVersions,
    filteredVersions,
    selectedVersion,
    setSelectedVersion,
    isDropdownOpen,
    setIsDropdownOpen,
    dropdownSearch,
    setDropdownSearch,
    dropdownRef,
    isAllVersions,
    isLatestVersion,
    latestVersion,
    currentVersionItem,
    hasOlderVersion,
    hasNewerVersion,
    goToOlderVersion,
    goToNewerVersion
  };
}
