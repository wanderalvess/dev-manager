import React from 'react';
import { Modal } from '../ui/Modal';
import { BindInputState } from '../../utils/sqlBinds';
import { useBindVariablesModalState } from '../../hooks/database/useBindVariablesModalState';
import { BindModalHeader } from './binds/BindModalHeader';
import { BindQuickActions } from './binds/BindQuickActions';
import { BindVariableRow } from './binds/BindVariableRow';
import { BindEmptyState } from './binds/BindEmptyState';
import { BindModalFooter } from './binds/BindModalFooter';

export interface BindVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bindInputs: BindInputState[];
  setBindInputs: React.Dispatch<React.SetStateAction<BindInputState[]>>;
  onConfirmExecute: (e?: React.FormEvent) => void;
  onSubstituteInline: () => void;
}

export const BindVariablesModal: React.FC<BindVariablesModalProps> = ({
  isOpen,
  onClose,
  bindInputs,
  setBindInputs,
  onConfirmExecute,
  onSubstituteInline
}) => {
  const state = useBindVariablesModalState(setBindInputs);

  const hasBinds = bindInputs.length > 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      bare
      closeOnBackdrop={false}
      panelClassName="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 font-sans animate-fade-in"
    >
        <BindModalHeader count={bindInputs.length} onClose={onClose} />

        <BindQuickActions
          hasBinds={hasBinds}
          showAddForm={state.showAddForm}
          setShowAddForm={state.setShowAddForm}
          newVarName={state.newVarName}
          setNewVarName={state.setNewVarName}
          newVarPrefix={state.newVarPrefix}
          setNewVarPrefix={state.setNewVarPrefix}
          onAddVariable={state.handleAddNewVariable}
          onClearAllValues={state.handleClearAllValues}
        />

        {/* Lista de Campos de Parâmetros */}
        <form onSubmit={onConfirmExecute} className="space-y-4">
          <div className="max-h-80 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
            {!hasBinds ? (
              <BindEmptyState />
            ) : (
              bindInputs.map((item, idx) => (
                <BindVariableRow
                  key={`${item.name}-${idx}`}
                  item={item}
                  idx={idx}
                  onChangeType={state.handleChangeType}
                  onChangeValue={state.handleChangeValue}
                  onRemove={state.handleRemoveVariable}
                />
              ))
            )}
          </div>

          <BindModalFooter hasBinds={hasBinds} onClose={onClose} onSubstituteInline={onSubstituteInline} />
        </form>
    </Modal>
  );
};
