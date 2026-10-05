import { useState, useRef, useCallback } from 'react';

/** Estado de rolagem do console: auto-scroll, aviso de novas linhas e detecção de rolagem manual. */
export function useLogScroll() {
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(true);
  const [hasNewLinesBelow, setHasNewLinesBelow] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Distingue rolagem programática (ignorada no onScroll) da rolagem do usuário
  const isAutoScrollingRef = useRef<boolean>(false);

  const handleScroll = () => {
    if (isAutoScrollingRef.current) {
      isAutoScrollingRef.current = false;
      return;
    }

    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 40;

    if (isAtBottom) {
      setIsAutoScroll(true);
      setHasNewLinesBelow(false);
    } else {
      setIsAutoScroll(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      isAutoScrollingRef.current = true;
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setIsAutoScroll(true);
      setHasNewLinesBelow(false);
    }
  };

  /** Centraliza uma linha pelo índice, desligando o auto-scroll. */
  const scrollToLine = useCallback((lineIndex: number) => {
    const el = document.getElementById(`log-line-${lineIndex}`);
    if (el) {
      isAutoScrollingRef.current = true;
      setIsAutoScroll(false);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return {
    isAutoScroll,
    setIsAutoScroll,
    hasNewLinesBelow,
    setHasNewLinesBelow,
    scrollContainerRef,
    isAutoScrollingRef,
    handleScroll,
    scrollToBottom,
    scrollToLine
  };
}
