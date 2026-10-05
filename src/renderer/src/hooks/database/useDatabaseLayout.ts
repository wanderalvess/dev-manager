import React, { useState } from 'react';

const SIDEBAR_KEY = 'devManager:sqlSidebarCollapsed';
const EDITOR_MAXIMIZED_KEY = 'devManager:sqlEditorMaximized';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore storage error */
  }
}

/** Estado de layout do DB Studio (sidebar recolhida e editor maximizado), persistido no localStorage. */
export function useDatabaseLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => readFlag(SIDEBAR_KEY));
  const [isEditorMaximized, setIsEditorMaximized] = useState<boolean>(() => readFlag(EDITOR_MAXIMIZED_KEY));

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      writeFlag(SIDEBAR_KEY, next);
      return next;
    });
  };

  const handleSetEditorMaximized: React.Dispatch<React.SetStateAction<boolean>> = (valOrFn) => {
    setIsEditorMaximized((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      writeFlag(EDITOR_MAXIMIZED_KEY, next);
      return next;
    });
  };

  return { isSidebarCollapsed, isEditorMaximized, handleToggleSidebar, handleSetEditorMaximized };
}
