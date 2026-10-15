import React from 'react';
import type { KarafBundleInfo } from '../../../../../shared/types';
import { useKarafUninstallModal } from '../../../hooks/karaf/useKarafUninstallModal';
import { KarafUninstallModalHeader } from '../uninstall/KarafUninstallModalHeader';
import { KarafUninstallBundleInfo } from '../uninstall/KarafUninstallBundleInfo';
import { KarafUninstallModeSelector } from '../uninstall/KarafUninstallModeSelector';
import { KarafUninstallFeatureForm } from '../uninstall/KarafUninstallFeatureForm';
import { KarafUninstallRiskPanel } from '../uninstall/KarafUninstallRiskPanel';
import { KarafUninstallModalFooter } from '../uninstall/KarafUninstallModalFooter';
import { Modal } from '../../ui/Modal';

interface KarafUninstallModalProps {
  target: KarafBundleInfo | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const KarafUninstallModal: React.FC<KarafUninstallModalProps> = ({
  target,
  onClose,
  onSuccess
}) => {
  const state = useKarafUninstallModal({ target, onClose, onSuccess });

  if (!target) return null;

  const confirmDisabled =
    state.isUninstalling ||
    state.isCheckingUninstallDeps ||
    (state.uninstallDepCheck?.riskLevel === 'HIGH' && !state.confirmUninstallChecked);

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <KarafUninstallModalHeader onClose={onClose} />

      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <KarafUninstallBundleInfo target={target} />

        <KarafUninstallModeSelector mode={state.uninstallMode} onChange={state.setUninstallMode} />

        {state.uninstallMode === 'feature' && (
          <KarafUninstallFeatureForm
            featureName={state.uninstallFeatureName}
            featureVersion={state.uninstallFeatureVersion}
            installedFeatures={state.installedFeaturesList}
            onNameChange={state.setUninstallFeatureName}
            onVersionChange={state.setUninstallFeatureVersion}
          />
        )}

        <KarafUninstallRiskPanel
          isChecking={state.isCheckingUninstallDeps}
          check={state.uninstallDepCheck}
          confirmChecked={state.confirmUninstallChecked}
          onConfirmCheckedChange={state.setConfirmUninstallChecked}
        />

        {/* Log ao vivo do bundle:uninstall + bundle:refresh */}
        {state.uninstallLog && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-2xs text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-slate-800">
            {state.uninstallLog}
          </div>
        )}
      </div>

      <KarafUninstallModalFooter
        isUninstalling={state.isUninstalling}
        confirmDisabled={confirmDisabled}
        onClose={onClose}
        onConfirm={state.handleConfirmUninstall}
      />
    </Modal>
  );
};
