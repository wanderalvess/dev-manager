import { useState, useCallback, useRef } from 'react';
import {
  clampColumnWidth,
  calculateExpandedWidth,
  DEFAULT_COLUMN_WIDTH
} from '../../utils/resultsGridUtils';

export function useResultsGridColumnResize() {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{
    col: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startResize = useCallback((col: string, e: React.MouseEvent, currentWidth?: number) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = currentWidth || columnWidths[col] || DEFAULT_COLUMN_WIDTH;

    resizingRef.current = { col, startX, startWidth };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaX = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = clampColumnWidth(resizingRef.current.startWidth, deltaX);
      setColumnWidths((prev) => ({
        ...prev,
        [resizingRef.current!.col]: newWidth
      }));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  const resetColumnWidth = useCallback((col: string) => {
    setColumnWidths((prev) => {
      const copy = { ...prev };
      delete copy[col];
      return copy;
    });
  }, []);

  const expandColumn = useCallback((col: string, extraWidth: number = 200) => {
    setColumnWidths((prev) => {
      const current = prev[col] || 180;
      return { ...prev, [col]: calculateExpandedWidth(current, extraWidth) };
    });
  }, []);

  return {
    columnWidths,
    setColumnWidths,
    startResize,
    resetColumnWidth,
    expandColumn
  };
}
