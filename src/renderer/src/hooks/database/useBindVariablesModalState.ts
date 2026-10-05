import React, { useState } from 'react';
import { BindInputState, SqlVariablePrefix } from '../../utils/sqlBinds';
import {
  appendManualBind,
  clearBindValues,
  normalizeBindName,
  removeBindAt,
  updateBindType,
  updateBindValue
} from '../../utils/bindVariablesModal';

export function useBindVariablesModalState(
  setBindInputs: React.Dispatch<React.SetStateAction<BindInputState[]>>
) {
  const [newVarName, setNewVarName] = useState<string>('');
  const [newVarPrefix, setNewVarPrefix] = useState<SqlVariablePrefix>(':');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const handleAddNewVariable = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeBindName(newVarName);
    if (!cleanName) return;

    setBindInputs((prev) => appendManualBind(prev, cleanName, newVarPrefix));

    setNewVarName('');
    setShowAddForm(false);
  };

  const handleRemoveVariable = (idx: number) => setBindInputs((prev) => removeBindAt(prev, idx));
  const handleClearAllValues = () => setBindInputs((prev) => clearBindValues(prev));
  const handleChangeType = (idx: number, type: BindInputState['type']) =>
    setBindInputs((prev) => updateBindType(prev, idx, type));
  const handleChangeValue = (idx: number, value: string) =>
    setBindInputs((prev) => updateBindValue(prev, idx, value));

  return {
    newVarName,
    setNewVarName,
    newVarPrefix,
    setNewVarPrefix,
    showAddForm,
    setShowAddForm,
    handleAddNewVariable,
    handleRemoveVariable,
    handleClearAllValues,
    handleChangeType,
    handleChangeValue
  };
}
