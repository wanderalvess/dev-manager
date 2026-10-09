import React from 'react';
import { Code2, Table } from 'lucide-react';
import { showToast } from '../../ToastHost';
import { Modal } from '../../ui/Modal';

interface QaRunnerSqlModalProps {
  title: string;
  sql: string;
  onClose: () => void;
  onCopy: (text: string, key: string) => void;
}

export const QaRunnerSqlModal: React.FC<QaRunnerSqlModalProps> = ({
  title,
  sql,
  onClose,
  onCopy
}) => {
  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-lg w-full max-w-2xl flex flex-col max-h-[85vh] shadow-xl"
      closeOnBackdrop={false}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs text-foreground flex items-center gap-2 font-mono">
          <Code2 className="w-3.5 h-3.5 text-primary" />
          <span>Consulta SQL — {title}</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-xs font-mono font-bold cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <pre className="p-3 rounded-md bg-background border border-border font-mono text-xs text-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {sql}
        </pre>
      </div>
      <div className="px-4 py-2.5 border-t border-border flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            onCopy(sql, 'modal-sql');
            showToast('SQL copiado!', 'success');
          }}
          className="px-3 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
        >
          Copiar SQL
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
};

interface QaRunnerRowsModalProps {
  title: string;
  rows: any[];
  onClose: () => void;
}

export const QaRunnerRowsModal: React.FC<QaRunnerRowsModalProps> = ({ title, rows, onClose }) => {
  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-lg w-full max-w-3xl flex flex-col max-h-[85vh] shadow-xl"
      closeOnBackdrop={false}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-xs text-foreground flex items-center gap-2 font-mono">
          <Table className="w-3.5 h-3.5 text-primary" />
          <span>{title}</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-xs font-mono font-bold cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <pre className="p-3 rounded-md bg-background border border-border font-mono text-2xs text-foreground overflow-x-auto leading-relaxed">
          {JSON.stringify(rows, null, 2)}
        </pre>
      </div>
      <div className="px-4 py-2.5 border-t border-border flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
};
