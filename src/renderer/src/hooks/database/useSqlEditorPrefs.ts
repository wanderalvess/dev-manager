import { useState } from 'react';
import type React from 'react';
import { parseStoredClamped } from '../../utils/sqlEditorUtils';

interface UseSqlEditorPrefsParams {
  isMaximized?: boolean;
  setIsMaximized?: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Preferências visuais do editor (altura, quebra de linha, fonte, maximizar), persistidas no localStorage. */
export function useSqlEditorPrefs({ isMaximized, setIsMaximized }: UseSqlEditorPrefsParams) {
  const [localMaximized, setLocalMaximized] = useState<boolean>(false);
  const isMaximizedActual = isMaximized !== undefined ? isMaximized : localMaximized;
  const toggleMaximize = () => {
    if (setIsMaximized) {
      setIsMaximized((prev) => !prev);
    } else {
      setLocalMaximized((prev) => !prev);
    }
  };

  const [editorHeight, setEditorHeight] = useState<number>(() => {
    try {
      return parseStoredClamped(localStorage.getItem('devManager:sqlEditorHeight'), 140, 800, 260);
    } catch {
      return 260;
    }
  });

  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    try {
      return localStorage.getItem('devManager:sqlWordWrap') !== 'false';
    } catch {
      return true;
    }
  });

  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      return parseStoredClamped(localStorage.getItem('devManager:sqlFontSize'), 10, 18, 12);
    } catch {
      return 12;
    }
  });

  const handleToggleWordWrap = () => {
    setWordWrap((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('devManager:sqlWordWrap', String(next));
      } catch {
        /* ignore storage error */
      }
      return next;
    });
  };

  const handleZoomIn = () => {
    setFontSize((prev) => {
      const next = Math.min(18, prev + 1);
      try {
        localStorage.setItem('devManager:sqlFontSize', String(next));
      } catch {
        /* ignore storage error */
      }
      return next;
    });
  };

  const handleZoomOut = () => {
    setFontSize((prev) => {
      const next = Math.max(10, prev - 1);
      try {
        localStorage.setItem('devManager:sqlFontSize', String(next));
      } catch {
        /* ignore storage error */
      }
      return next;
    });
  };

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(140, Math.min(window.innerHeight - 200, startHeight + delta));
      setEditorHeight(newHeight);
      try {
        localStorage.setItem('devManager:sqlEditorHeight', String(newHeight));
      } catch {
        /* ignore storage error */
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return {
    isMaximizedActual,
    toggleMaximize,
    editorHeight,
    wordWrap,
    fontSize,
    handleToggleWordWrap,
    handleZoomIn,
    handleZoomOut,
    handleSplitterMouseDown
  };
}
