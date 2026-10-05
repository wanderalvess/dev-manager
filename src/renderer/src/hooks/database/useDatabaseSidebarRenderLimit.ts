import React, { useEffect, useState } from 'react';
import {
  TABLES_RENDER_STEP,
  hasMoreTablesToRender,
  shouldLoadMoreOnScroll
} from '../../utils/databaseSidebarRender';

export function useDatabaseSidebarRenderLimit(filteredTables: string[]) {
  const [renderLimit, setRenderLimit] = useState(TABLES_RENDER_STEP);

  useEffect(() => {
    setRenderLimit(TABLES_RENDER_STEP);
  }, [filteredTables]);

  const visibleTables = filteredTables.slice(0, renderLimit);
  const hasMoreTables = hasMoreTablesToRender(filteredTables.length, renderLimit);
  const showMoreTables = () => setRenderLimit((n) => n + TABLES_RENDER_STEP);

  const handleTablesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (shouldLoadMoreOnScroll(hasMoreTables, el.scrollTop, el.clientHeight, el.scrollHeight)) {
      showMoreTables();
    }
  };

  return { visibleTables, hasMoreTables, showMoreTables, handleTablesScroll };
}
