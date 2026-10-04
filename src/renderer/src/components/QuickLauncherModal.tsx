import React from 'react';
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
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
    </div>
  );
};
