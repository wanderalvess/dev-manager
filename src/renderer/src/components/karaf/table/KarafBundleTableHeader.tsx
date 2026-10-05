import React from 'react';
import { getSelectAllTitle, isAllVisibleSelected } from '../../../utils/karafBundleTableView';

interface KarafBundleTableHeaderProps {
  filteredCount: number;
  selectedCount: number;
  onSelectAllVisible: () => void;
}

export const KarafBundleTableHeader: React.FC<KarafBundleTableHeaderProps> = ({
  filteredCount,
  selectedCount,
  onSelectAllVisible
}) => (
  <thead className="sticky top-0 z-20 shadow-xs">
    <tr className="bg-muted">
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left w-12 border-b border-border select-none">
        <input
          type="checkbox"
          checked={isAllVisibleSelected(filteredCount, selectedCount)}
          onChange={onSelectAllVisible}
          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
          title={getSelectAllTitle(filteredCount, selectedCount)}
        />
      </th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-20 border-b border-border select-none text-[11px]">ID</th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-36 border-b border-border select-none text-[11px]">Estado</th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider min-w-[340px] border-b border-border select-none text-[11px]">Nome do Bundle / SymbolicName</th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-36 border-b border-border select-none text-[11px]">Versão</th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-right text-muted-foreground uppercase font-bold tracking-wider w-72 border-b border-border select-none text-[11px]">Ações</th>
    </tr>
  </thead>
);
