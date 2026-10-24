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
  <thead className="sticky top-0 z-20 shadow-2xs">
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
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground font-semibold w-20 border-b border-border select-none text-xs">ID</th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground font-semibold w-36 border-b border-border select-none text-xs">Estado</th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground font-semibold min-w-[340px] border-b border-border select-none text-xs">Nome do Bundle / SymbolicName</th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground font-semibold w-36 border-b border-border select-none text-xs">Versão</th>
      <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-right text-muted-foreground font-semibold w-72 border-b border-border select-none text-xs">Ações</th>
    </tr>
  </thead>
);
