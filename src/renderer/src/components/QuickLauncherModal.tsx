import React from 'react';
import { Modal } from './ui/Modal';
import { GitProjectInfo } from '../../../shared/types';
import { useQuickLauncher } from '../hooks/quicklauncher/useQuickLauncher';
import { QuickLauncherSearchBar } from './quicklauncher/QuickLauncherSearchBar';
import { QuickLauncherList } from './quicklauncher/QuickLauncherList';
import { QuickLauncherFooter } from './quicklauncher/QuickLauncherFooter';

interface QuickLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  projects: GitProjectInfo[];
  onRefreshAll: () => void;
}

export const QuickLauncherModal: React.FC<QuickLauncherModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  projects,
  onRefreshAll
}) => {
  const {
    search,
    setSearch,
    selectedIndex,
    setSelectedIndex,
    filteredItems,
    inputRef,
    listRef,
    handleKeyDown
  } = useQuickLauncher({ isOpen, onClose, onNavigate, projects, onRefreshAll });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      bare
      placement="top"
      ariaLabel="Paleta de comandos"
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[75vh]"
    >
      <div className="contents" onKeyDown={handleKeyDown}>
        <QuickLauncherSearchBar search={search} onSearchChange={setSearch} inputRef={inputRef} />
        <QuickLauncherList
          items={filteredItems}
          selectedIndex={selectedIndex}
          search={search}
          listRef={listRef}
          onHover={setSelectedIndex}
        />
        <QuickLauncherFooter resultCount={filteredItems.length} />
      </div>
    </Modal>
  );
};
