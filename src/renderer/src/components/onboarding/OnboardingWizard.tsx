import React from 'react';
import { Modal } from '../ui/Modal';
import type { TourStep } from './tourSteps';

export const OnboardingWizard: React.FC<{
  isOpen: boolean;
  onFinish: (wantsTour: boolean) => void;
  onSettingsSaved: () => void;
  onOpenSettings: () => void;
  onOpenInfrFirstSteps: () => void;
}> = ({ isOpen, onFinish, onOpenSettings }) => {
  if (!isOpen) return null;
  return (
    <Modal open={isOpen} onClose={() => onFinish(false)} panelClassName="max-w-md w-full p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground">Configuração Inicial</h3>
      <p className="text-xs text-muted-foreground">Personalize diretórios, conexões de banco e módulos ativos em Configurações.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => { onFinish(false); onOpenSettings(); }} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold cursor-pointer">
          Abrir Configurações
        </button>
        <button type="button" onClick={() => onFinish(false)} className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer">
          Concluir
        </button>
      </div>
    </Modal>
  );
};

export const OnboardingTour: React.FC<{
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  storageKey: string;
}> = ({ steps, isOpen, onClose }) => {
  const [index, setIndex] = React.useState(0);
  if (!isOpen || steps.length === 0) return null;
  const step = steps[Math.min(index, steps.length - 1)];
  return (
    <Modal open={isOpen} onClose={onClose} panelClassName="max-w-md w-full p-5 space-y-4">
      <div className="text-2xs font-mono text-primary">Passo {index + 1} de {steps.length}</div>
      <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
      <p className="text-xs text-muted-foreground">{step.content}</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border text-xs cursor-pointer">Pular</button>
        {index + 1 < steps.length ? (
          <button type="button" onClick={() => setIndex((i) => i + 1)} className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer">Próximo</button>
        ) : (
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer">Finalizar</button>
        )}
      </div>
    </Modal>
  );
};

export const PageToursPromptModal: React.FC<{ isOpen: boolean; onSelectChoice: () => void }> = ({ isOpen, onSelectChoice }) => {
  if (!isOpen) return null;
  return (
    <Modal open={isOpen} onClose={onSelectChoice} panelClassName="max-w-sm w-full p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground">Tours das Páginas</h3>
      <p className="text-xs text-muted-foreground">Os guias interativos das páginas foram redefinidos.</p>
      <div className="flex justify-end">
        <button type="button" onClick={onSelectChoice} className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer">OK</button>
      </div>
    </Modal>
  );
};
