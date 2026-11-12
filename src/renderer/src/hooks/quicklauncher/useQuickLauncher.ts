import { useEffect, useMemo, useRef, useState } from 'react';
import { GitPullRequest, RefreshCw, Settings, HelpCircle } from 'lucide-react';
import { NAV_THEME_GROUPS } from '../../components/header/headerNavConfig';
import type { QuickLauncherItem } from '../../components/quicklauncher/QuickLauncherList';
import type { GitProjectInfo } from '../../../../shared/types';

export function useQuickLauncher(params: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  disabledModules: readonly string[];
  projects: GitProjectInfo[];
  onRefreshAll: () => void;
}) {
  const { isOpen, onClose, onNavigate, disabledModules, projects, onRefreshAll } = params;
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const allItems = useMemo<QuickLauncherItem[]>(() => {
    const items: QuickLauncherItem[] = [];
    for (const g of NAV_THEME_GROUPS) {
      for (const m of g.items) {
        if (disabledModules.includes(m.id)) continue;
        items.push({
          id: `nav-${m.id}`,
          label: m.label,
          description: m.description,
          category: g.shortTitle,
          badge: m.shortcut,
          icon: m.icon,
          action: () => { onNavigate(m.id); onClose(); }
        });
      }
    }
    items.push(
      {
        id: 'nav-settings',
        label: 'Configurações',
        description: 'Módulos, diretórios, bancos e preferências',
        category: 'Sistema',
        icon: Settings,
        action: () => { onNavigate('settings'); onClose(); }
      },
      {
        id: 'nav-help',
        label: 'Central de Ajuda',
        description: 'Documentação, atalhos e diagnósticos',
        category: 'Sistema',
        badge: 'Alt+H',
        icon: HelpCircle,
        action: () => { onNavigate('help'); onClose(); }
      },
      {
        id: 'act-refresh',
        label: 'Atualizar Status Geral',
        description: 'Recarregar serviços, portas e repositórios',
        category: 'Ação',
        icon: RefreshCw,
        action: () => { onRefreshAll(); onClose(); }
      }
    );
    for (const p of projects) {
      items.push({
        id: `proj-${p.name}`,
        label: p.name,
        description: `Branch: ${p.branch}`,
        category: 'Git',
        icon: GitPullRequest,
        action: () => { onNavigate('git'); onClose(); }
      });
    }
    return items;
  }, [disabledModules, projects, onNavigate, onClose, onRefreshAll]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [allItems, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(filteredItems.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
    }
  };

  return { search, setSearch, selectedIndex, setSelectedIndex, filteredItems, inputRef, listRef, handleKeyDown };
}
