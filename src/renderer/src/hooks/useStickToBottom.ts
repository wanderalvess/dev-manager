import { useEffect, useRef, useState } from 'react';

export function useStickToBottom<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const [pinned, setPinned] = useState(true);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance < 24);
  };

  useEffect(() => {
    if (pinned && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, onScroll };
}
