import React from 'react';
import { Info, X } from 'lucide-react';
import { KarafBundleInfo } from '../../../../../shared/types';
import { useKarafDetailsModal } from '../../../hooks/karaf/useKarafDetailsModal';
import { KarafDetailsTabBar } from '../details/KarafDetailsTabBar';
import { KarafDetailsTabContent } from '../details/KarafDetailsTabContent';
import { Modal } from '../../ui/Modal';

interface KarafDetailsModalProps {
  target: KarafBundleInfo | null;
  onClose: () => void;
}

export const KarafDetailsModal: React.FC<KarafDetailsModalProps> = ({
  target,
  onClose
}) => {
  const { bundleDetails, isLoadingDetails, detailsTab, setDetailsTab } = useKarafDetailsModal(target);

  if (!target) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl xl:max-w-6xl h-[86vh] flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              [{target.id}] {target.name}
            </h4>
            <p className="text-2xs text-muted-foreground font-mono">
              Versão: {target.version} · Estado: {target.state}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <KarafDetailsTabBar bundleDetails={bundleDetails} detailsTab={detailsTab} onChange={setDetailsTab} />

      <KarafDetailsTabContent
        target={target}
        bundleDetails={bundleDetails}
        isLoadingDetails={isLoadingDetails}
        detailsTab={detailsTab}
      />

      <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
};
