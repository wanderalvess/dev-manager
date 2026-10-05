import React, { useId } from 'react';

interface DirsPathFieldProps {
  fieldId?: string;
  wrapperClassName?: string;
  labelIcon: React.ReactNode;
  labelText: string;
  labelTitle?: string;
  statusBadge?: React.ReactNode;
  inputValue: string | undefined;
  inputTourId?: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBrowse: () => void;
  browseIcon: React.ReactNode;
  browseTitle: string;
  hint?: React.ReactNode;
}

export const DirsPathField: React.FC<DirsPathFieldProps> = ({
  fieldId,
  wrapperClassName = 'space-y-1.5',
  labelIcon,
  labelText,
  labelTitle,
  statusBadge,
  inputValue,
  inputTourId,
  placeholder,
  onChange,
  onBrowse,
  browseIcon,
  browseTitle,
  hint
}) => {
  const inputId = useId();
  return (
  <div className={wrapperClassName} id={fieldId}>
    <div className="flex items-center justify-between">
      <label htmlFor={inputId} className="font-bold text-foreground flex items-center gap-1.5" title={labelTitle}>
        {labelIcon}
        {labelText}
      </label>
      {statusBadge}
    </div>
    <div className="flex items-center space-x-2">
      <input id={inputId}
        type="text"
        data-tour={inputTourId}
        value={inputValue}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onBrowse}
        className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
        title={browseTitle}
      >
        {browseIcon}
        <span>Procurar...</span>
      </button>
    </div>
    {hint}
  </div>
  );
};
