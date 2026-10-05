import React from 'react';
import { MarkdownReader } from './MarkdownReader';
import { useWhatsNewModal } from '../hooks/whatsnew/useWhatsNewModal';
import { WhatsNewHeaderControls } from './whatsnew/WhatsNewHeaderControls';
import { WhatsNewBanner } from './whatsnew/WhatsNewBanner';
import { WhatsNewFooterButtons } from './whatsnew/WhatsNewFooterButtons';

export interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  changelogContent: string;
  currentAppVersion?: string;
  initialVersion?: string;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  onClose,
  changelogContent,
  currentAppVersion,
  initialVersion
}) => {
  const state = useWhatsNewModal({ isOpen, changelogContent, currentAppVersion, initialVersion });

  if (!isOpen) return null;

  const displayTitle = state.isAllVersions
    ? 'Histórico Completo de Mudanças'
    : 'Novidades da Versão';

  const displayContent = state.isAllVersions
    ? changelogContent
    : state.currentVersionItem?.content || changelogContent;

  return (
    <MarkdownReader
      title={displayTitle}
      filePath="CHANGELOG.md • Histórico oficial de releases"
      content={displayContent}
      onClose={onClose}
      headerLeftExtra={
        <WhatsNewHeaderControls
          dropdownRef={state.dropdownRef}
          filteredVersions={state.filteredVersions}
          selectedVersion={state.selectedVersion}
          isAllVersions={state.isAllVersions}
          isLatestVersion={state.isLatestVersion}
          isDropdownOpen={state.isDropdownOpen}
          dropdownSearch={state.dropdownSearch}
          hasOlderVersion={state.hasOlderVersion}
          hasNewerVersion={state.hasNewerVersion}
          onGoOlder={state.goToOlderVersion}
          onGoNewer={state.goToNewerVersion}
          onToggleDropdown={() => {
            state.setIsDropdownOpen((prev) => !prev);
            state.setDropdownSearch('');
          }}
          onCloseDropdown={() => state.setIsDropdownOpen(false)}
          onSearchChange={state.setDropdownSearch}
          onSelectVersion={state.setSelectedVersion}
        />
      }
      hideBadge={true}
      bannerExtra={
        <WhatsNewBanner
          isAllVersions={state.isAllVersions}
          isLatestVersion={state.isLatestVersion}
          selectedVersion={state.selectedVersion}
          latestVersion={state.latestVersion}
          currentVersionItem={state.currentVersionItem}
          onSelectVersion={state.setSelectedVersion}
        />
      }
      footerExtra={
        <WhatsNewFooterButtons
          parsedVersions={state.parsedVersions}
          isAllVersions={state.isAllVersions}
          isLatestVersion={state.isLatestVersion}
          latestVersion={state.latestVersion}
          onSelectVersion={state.setSelectedVersion}
        />
      }
    />
  );
};
