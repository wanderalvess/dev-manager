import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Command,
  Globe,
  HardDrive,
  Plus,
  RefreshCw,
  Server,
  Terminal,
  X
} from 'lucide-react';
import type { TerminalProfile, TerminalProfileKind } from '../../../../shared/terminalTypes';
import type { TerminalTabSession } from '../../hooks/karafConsole/useTerminalSessions';

import { TerminalSshMenuForm } from './TerminalSshMenuForm';

interface TerminalTabBarProps {
  profiles: TerminalProfile[];
  profilesLoading: boolean;
  sessions: TerminalTabSession[];
  activeTabId: string;
  karafActive: boolean;
  onSelectTab: (tabId: string) => void;
  onOpenDefaultShell: () => void;
  onOpenProfile: (profileId: string, options?: { sshTarget?: string; sshPort?: number }) => Promise<boolean>;
  onCloseSession: (sessionId: string) => void;
  onRefreshProfiles: () => void;
}

function ProfileKindIcon({ kind }: { kind: TerminalProfileKind }) {
  switch (kind) {
    case 'powershell':
      return <Command className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
    case 'cmd':
      return <Terminal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    case 'wsl':
      return <HardDrive className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case 'ssh':
      return <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    case 'karaf':
      return <Server className="w-3.5 h-3.5 text-primary shrink-0" />;
    default:
      return <Terminal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  }
}

export const TerminalTabBar: React.FC<TerminalTabBarProps> = ({
  profiles,
  profilesLoading,
  sessions,
  activeTabId,
  karafActive,
  onSelectTab,
  onOpenDefaultShell,
  onOpenProfile,
  onCloseSession,
  onRefreshProfiles
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sshFormOpen, setSshFormOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSshFormOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setSshFormOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleSelectProfile = async (profile: TerminalProfile) => {
    if (profile.kind === 'ssh') {
      setSshFormOpen(true);
      return;
    }
    setMenuOpen(false);
    setSshFormOpen(false);
    await onOpenProfile(profile.id);
  };

  const tabClass = (isActive: boolean) =>
    `group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-semibold border transition cursor-pointer shrink-0 max-w-[175px] ${
      isActive
        ? 'bg-primary/10 text-foreground border-primary/40 shadow-2xs'
        : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground'
    }`;

  return (
    <div className="relative flex items-center gap-1 px-2.5 py-1.5 border-b border-border/80 bg-muted/25 shrink-0">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onSelectTab('karaf')}
          className={tabClass(activeTabId === 'karaf')}
          title="Console interativo do Apache Karaf OSGi"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              karafActive ? 'bg-emerald-500' : 'bg-muted-foreground/50'
            }`}
          />
          <span className="truncate">Karaf OSGi</span>
        </button>

        {sessions.map(({ info }) => {
          const isActive = activeTabId === info.sessionId;
          return (
            <div key={info.sessionId} className={tabClass(isActive)} onClick={() => onSelectTab(info.sessionId)}>
              <ProfileKindIcon kind={info.kind} />
              <span className="truncate">{info.title}</span>
              {!info.alive && <span className="text-[10px] text-amber-500 shrink-0">(fim)</span>}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseSession(info.sessionId);
                }}
                aria-label={`Fechar aba ${info.title}`}
                title="Fechar terminal"
                className="p-0.5 rounded hover:bg-destructive/15 hover:text-destructive opacity-70 group-hover:opacity-100 transition cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div ref={menuRef} className="relative flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setSshFormOpen(false);
            onOpenDefaultShell();
          }}
          title="Abrir novo terminal padrão"
          aria-label="Abrir novo terminal"
          className="p-1.5 rounded-md border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setMenuOpen((prev) => !prev);
            setSshFormOpen(false);
          }}
          title="Escolher tipo de terminal (PowerShell, CMD, Bash, WSL, SSH...)"
          aria-label="Escolher perfil de terminal"
          aria-expanded={menuOpen}
          className="p-1.5 rounded-md border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-card text-foreground shadow-xl z-50 py-1.5"
          >
            {!sshFormOpen ? (
              <>
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Abrir terminal integrado
                </div>
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    role="menuitem"
                    onClick={() => void handleSelectProfile(profile)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-primary hover:text-primary-foreground transition cursor-pointer group"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <ProfileKindIcon kind={profile.kind} />
                      <span className="truncate font-medium">{profile.label}</span>
                    </span>
                    {profile.subtitle && (
                      <span className="text-[10px] opacity-65 shrink-0 font-mono">{profile.subtitle}</span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSelectTab('karaf');
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-primary hover:text-primary-foreground transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <ProfileKindIcon kind="karaf" />
                    <span className="truncate font-medium">Console Karaf OSGi</span>
                  </span>
                  <span className="text-[10px] opacity-65 shrink-0 font-mono">karaf&gt;</span>
                </button>
                <div className="my-1 border-t border-border/70" />
                <button
                  type="button"
                  onClick={onRefreshProfiles}
                  disabled={profilesLoading}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-2xs text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${profilesLoading ? 'animate-spin' : ''}`} />
                  <span>Atualizar perfis detectados</span>
                </button>
              </>
            ) : (
              <TerminalSshMenuForm
                onCancel={() => setSshFormOpen(false)}
                onSubmit={async (target, port) => {
                  const ok = await onOpenProfile('ssh', { sshTarget: target, sshPort: port });
                  if (ok) {
                    setMenuOpen(false);
                    setSshFormOpen(false);
                  }
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
