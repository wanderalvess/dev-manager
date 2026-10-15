import React from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface KarafFeaturesManagerFeedbackProps {
  feedback: { type: 'success' | 'error'; text: string };
  onDismiss: () => void;
}

export const KarafFeaturesManagerFeedback: React.FC<KarafFeaturesManagerFeedbackProps> = ({
  feedback,
  onDismiss
}) => (
  <div
    className={`px-5 py-2 text-xs font-mono flex items-center justify-between border-b ${
      feedback.type === 'success'
        ? 'bg-success/10 border-success/30 text-success'
        : 'bg-danger/10 border-danger/30 text-danger'
    }`}
  >
    <div className="flex items-center space-x-2">
      {feedback.type === 'success' ? (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{feedback.text}</span>
    </div>
    <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);
