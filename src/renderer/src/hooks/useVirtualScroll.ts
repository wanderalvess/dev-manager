import React, { useState, useEffect, useMemo, useCallback, RefObject } from 'react';

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

export type VirtualScrollContainer = RefObject<HTMLElement | null> | HTMLElement | null;

export interface UseVirtualScrollReturn {
  virtualItems: VirtualItem[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  offsetY: number;
  isVirtual: boolean;
  onScroll: React.UIEventHandler<HTMLElement>;
  setContainerRef: (node: HTMLElement | null) => void;
  scrollToTop: () => void;
}

/**
 * Hook reutilizável de virtualização de rolagem (Windowing).
 * Renderiza apenas os itens dentro da viewport visível mais um overscan de segurança,
 * mantendo a taxa de quadros a 60 FPS mesmo com milhares de linhas.
 */
export function useVirtualScroll(
  containerTarget: VirtualScrollContainer,
  options: UseVirtualScrollOptions
): UseVirtualScrollReturn {
  const { itemCount, itemHeight, overscan = 8 } = options;
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const [containerNode, setContainerNode] = useState<HTMLElement | null>(null);

  // Threshold mínimo de itens para ativar a virtualização (abaixo disso, renderiza normal)
  const isVirtual = itemCount > 60;

  // Callback ref que pode ser conectado ao container JSX (<div ref={setContainerRef}>)
  const setContainerRef = useCallback((node: HTMLElement | null) => {
    setContainerNode(node);
    if (containerTarget && 'current' in containerTarget) {
      (containerTarget as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  }, [containerTarget]);

  // Sincroniza elemento caso o chamador passe um ref mutável sem usar setContainerRef
  useEffect(() => {
    if (containerNode) return;
    const targetEl = containerTarget && 'current' in containerTarget ? containerTarget.current : containerTarget;
    if (targetEl && targetEl !== containerNode) {
      setContainerNode(targetEl);
    }
  }, [containerNode, containerTarget]);

  const activeElement = containerNode || (containerTarget && 'current' in containerTarget ? containerTarget.current : containerTarget) || null;

  // Observa mudanças de tamanho e rolagem nativa do container
  useEffect(() => {
    if (!activeElement) return;

    if (activeElement.clientHeight > 0) {
      setContainerHeight(activeElement.clientHeight);
    }
    setScrollTop(activeElement.scrollTop || 0);

    const onNativeScroll = () => {
      setScrollTop(activeElement.scrollTop);
    };

    activeElement.addEventListener('scroll', onNativeScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.height > 0) {
            setContainerHeight(entry.contentRect.height);
          }
        }
      });
      resizeObserver.observe(activeElement);
    }

    return () => {
      activeElement.removeEventListener('scroll', onNativeScroll);
      resizeObserver?.disconnect();
    };
  }, [activeElement]);

  // Handler de scroll reativo para o JSX (garante resposta imediata sem depender do ciclo de efeitos)
  const handleScroll: React.UIEventHandler<HTMLElement> = useCallback((e) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    if (target.clientHeight > 0 && Math.abs(target.clientHeight - containerHeight) > 4) {
      setContainerHeight(target.clientHeight);
    }
  }, [containerHeight]);

  const scrollToTop = useCallback(() => {
    if (activeElement) {
      activeElement.scrollTop = 0;
    }
    setScrollTop(0);
  }, [activeElement]);

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
    isVirtual,
    onScroll: handleScroll,
    setContainerRef,
    scrollToTop
  };
}
