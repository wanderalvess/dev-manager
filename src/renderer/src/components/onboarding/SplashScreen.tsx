import React from 'react';
import { AppLogo } from '../AppLogo';
import { Modal } from '../ui/Modal';
import { ArrowRight, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  isOpen: boolean;
  isNewUser: boolean;
  appVersion: string;
  onStartOnboarding: () => void;
  onExplore: () => void;
  onEnter: () => void;
  onOpenTab: (tab: string) => void;
  onWhatsNew: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isOpen,
  appVersion,
  onEnter,
  onOpenTab,
  onWhatsNew
}) => {
  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onEnter} bare panelClassName="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo size="md" showStatusDot />
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Hub Manager</h2>
            <p className="text-xs text-muted-foreground">Cockpit Integrado de Operação, Desenvolvimento e Qualidade • v{appVersion}</p>
          </div>
        </div>
        <button type="button" onClick={onWhatsNew} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer">
          <Sparkles className="w-3.5 h-3.5" /> Novidades
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        {[
          { id: 'env', title: 'Ambiente Dev', desc: 'Serviços, portas e pipeline 1-clique' },
          { id: 'database', title: 'Banco de Dados', desc: 'SQL Studio multi-vendor & backups' },
          { id: 'karaf', title: 'Karaf & OSGi', desc: 'Bundles, features e console interativo' },
          { id: 'http-client', title: 'API Studio', desc: 'Cliente REST com proxy integrado' }
        ].map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onOpenTab(card.id)}
            className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition cursor-pointer"
          >
            <div className="font-bold text-foreground">{card.title}</div>
            <div className="text-2xs text-muted-foreground mt-0.5">{card.desc}</div>
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onEnter}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
        >
          Entrar no Cockpit <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </Modal>
  );
};
