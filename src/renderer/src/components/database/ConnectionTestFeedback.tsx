import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ConnectionTestFeedbackProps {
  testResult: {
    success: boolean;
    message: string;
    version?: string;
  } | null;
}

export const ConnectionTestFeedback: React.FC<ConnectionTestFeedbackProps> = ({ testResult }) => {
  if (!testResult) return null;

  return (
    <div
      className={`p-3 rounded-xl text-2xs border ${
        testResult.success
          ? 'bg-success/10 border-success/30 text-success'
          : 'bg-danger/10 border-danger/30 text-danger'
      }`}
    >
      <div className="flex items-center space-x-2 font-bold">
        {testResult.success ? (
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
        )}
        <span>{testResult.message}</span>
      </div>
      {testResult.version && (
        <p className="text-2xs font-mono opacity-80 mt-1 break-words" title={testResult.version}>
          {testResult.version}
        </p>
      )}
    </div>
  );
};
