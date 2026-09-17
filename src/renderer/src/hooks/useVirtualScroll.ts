import { useState, useEffect, useCallback, useMemo, RefObject } from 'react';

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

export interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
}

export interface UseVirtualScrollReturn {
  virtualItems: VirtualItem[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  offsetY: number;
  isVirtual: boolean;
}

/**
 * Hook reutilizável de virtualização de rolagem (Windowing).
 * Renderiza apenas os itens dentro da viewport visível mais um overscan de segurança,
 * mantendo a taxa de quadros a 60 FPS mesmo com milhares de linhas.
 */
export function useVirtualScroll(
  containerRef: RefObject<HTMLElement | null>,
  options: UseVirtualScrollOptions
): UseVirtualScrollReturn {
  const { itemCount, itemHeight, overscan = 8 } = options;
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  // Threshold mínimo de itens para ativar a virtualização (abaixo disso, renderiza normal)
  const isVirtual = itemCount > 60;

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, [containerRef]);

  // Observa mudanças de tamanho do container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerHeight(el.clientHeight || 600);
    setScrollTop(el.scrollTop || 0);

    const onScroll = () => {
      setScrollTop(el.scrollTop);
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.height > 0) {
            setContainerHeight(entry.contentRect.height);
          }
        }
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      resizeObserver?.disconnect();
    };
  }, [containerRef]);

  const { startIndex, endIndex, virtualItems, totalHeight, offsetY } = useMemo(() => {
    const total = itemCount * itemHeight;

    if (!isVirtual || itemCount === 0) {
      const allItems: VirtualItem[] = Array.from({ length: itemCount }, (_, i) => ({
        index: i,
        start: i * itemHeight,
        size: itemHeight
      }));
      return {
        startIndex: 0,
        endIndex: itemCount,
        virtualItems: allItems,
        totalHeight: total,
        offsetY: 0
      };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(itemCount, start + visibleCount + overscan * 2);

    const items: VirtualItem[] = [];
    for (let i = start; i < end; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        size: itemHeight
      });
    }

    return {
      startIndex: start,
      endIndex: end,
      virtualItems: items,
      totalHeight: total,
      offsetY: start * itemHeight
    };
  }, [itemCount, itemHeight, overscan, scrollTop, containerHeight, isVirtual]);

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    offsetY,
    isVirtual
  };
}
