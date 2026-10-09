import React from 'react';
import { Compass, CheckCircle2, ArrowRight } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import { PAGE_TOURS_PREF_KEY } from './usePageTour';
import { showToast } from '../ToastHost';
import { Modal } from '../ui/Modal';

interface PageToursPromptModalProps {
  isOpen: boolean;
  onSelectChoice: (enablePageTours: boolean) => void;
}

export const PageToursPromptModal: React.FC<PageToursPromptModalProps> = ({ isOpen, onSelectChoice }) => {
  const handleChoose = (enabled: boolean) => {
    try {
      window.localStorage.setItem(PAGE_TOURS_PREF_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignora erro de localStorage indisponível
    }

    if (enabled) {
      showToast('Tutoriais das telas ativados! Eles aparecerão ao entrar em cada módulo.', 'success');
    } else {
      showToast('Tutoriais das telas desativados. Você pode iniciá-los quando quiser na Central de Ajuda.', 'success');
    }

    onSelectChoice(enabled);
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => undefined}
      dismissible={false}
      bare
      zIndexClass="z-10001"
      panelClassName="bg-card text-card-foreground border border-border/80 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
    >
        <div className="flex items-center space-x-3">
          <AppLogo size="md" />
          <div>
            <span className="text-2xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              Tour Geral Concluído 🎉
            </span>
            <h2 className="text-sm sm:text-base font-bold text-foreground mt-1 leading-tight">
              Deseja ver tutoriais ao entrar em cada tela?
            </h2>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          O Hub Manager possui tours rápidos em módulos como <strong>Banco de Dados</strong>, <strong>Rotinas</strong>,{' '}
          <strong>Deploy</strong>, <strong>Containers</strong> e <strong>Git</strong> para apresentar os recursos. Você
          pode vê-los ao visitar cada tela ou pular todos agora e explorar por conta própria.
        </p>

        <div className="space-y-2.5 pt-1">
          {/* Opção 1: Ativar tutoriais de cada tela */}
          <button
            type="button"
            onClick={() => handleChoose(true)}
            className="w-full text-left p-3.5 rounded-xl border border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 transition flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Sim, ver tutoriais em cada tela
                </div>
                <div className="text-2xs text-muted-foreground truncate">
                  Aparecerá automaticamente na 1ª visita a cada módulo
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* Opção 2: Pular e desativar próximos tutoriais */}
          <button
            type="button"
            onClick={() => handleChoose(false)}
            className="w-full text-left p-3 rounded-xl border border-border/80 hover:border-border hover:bg-muted/40 transition flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 border border-border/60">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground">
                  Pular e explorar sozinho
                </div>
                <div className="text-2xs text-muted-foreground truncate">
                  Sem interrupções; você pode rever na Central de Ajuda
                </div>
              </div>
            </div>
          </button>
        </div>
    </Modal>
  );
};
