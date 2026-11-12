import { useMemo, useRef, useState } from 'react';

export function useWhatsNewModal(params: {
  isOpen: boolean;
  changelogContent: string;
  currentAppVersion?: string;
  initialVersion?: string;
}) {
  const { changelogContent, currentAppVersion, initialVersion } = params;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  const parsedVersions = useMemo(() => {
    const sections = changelogContent.split(/^##\s+/m).slice(1);
    return sections.map((sec) => {
      const firstLine = sec.split('\n')[0] || '';
      const m = firstLine.match(/(\d+\.\d+\.\d+)/);
      const version = m ? m[1] : firstLine.trim().slice(0, 16);
      return { version, content: `## ${sec}` };
    });
  }, [changelogContent]);

  const latestVersion = parsedVersions[0]?.version || currentAppVersion || '1.68.1';
  const [selectedVersion, setSelectedVersion] = useState<string>(initialVersion || latestVersion);

  const isAllVersions = selectedVersion === 'all';
  const currentIdx = parsedVersions.findIndex((v) => v.version === selectedVersion);
  const currentVersionItem = currentIdx >= 0 ? parsedVersions[currentIdx] : parsedVersions[0];

  return {
    dropdownRef,
    parsedVersions,
    filteredVersions: parsedVersions,
    selectedVersion,
    setSelectedVersion,
    latestVersion,
    isAllVersions,
    isLatestVersion: selectedVersion === latestVersion,
    isDropdownOpen,
    setIsDropdownOpen,
    dropdownSearch,
    setDropdownSearch,
    currentVersionItem,
    hasOlderVersion: currentIdx >= 0 && currentIdx + 1 < parsedVersions.length,
    hasNewerVersion: currentIdx > 0,
    goToOlderVersion: () => {
      if (currentIdx + 1 < parsedVersions.length) setSelectedVersion(parsedVersions[currentIdx + 1].version);
    },
    goToNewerVersion: () => {
      if (currentIdx > 0) setSelectedVersion(parsedVersions[currentIdx - 1].version);
    }
  };
}
