import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface WslSnapshotsFeedbackProps {
  feedback: { success: boolean; message: string };
  onDismiss: () => void;
}

export const WslSnapshotsFeedback: React.FC<WslSnapshotsFeedbackProps> = ({ feedback, onDismiss }) => (
  <div
    className={`mx-5 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
      feedback.success
        ? 'bg-success/10 border-success/30 text-success'
        : 'bg-danger/10 border-danger/30 text-danger'
    }`}
  >
    <div className="flex items-center gap-2">
      {feedback.success ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span>{feedback.message}</span>
    </div>
    <button onClick={onDismiss} className="p-1 hover:opacity-70 cursor-pointer">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);
