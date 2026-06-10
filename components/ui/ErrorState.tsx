import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export default function ErrorState({ message, onRetry, compact }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-red-400 ${compact ? 'py-8' : 'py-16'}`}>
      <AlertCircle size={compact ? 20 : 32} className="mb-3 opacity-60" />
      <span className={`font-bold text-center ${compact ? 'text-xs' : 'text-sm'} text-red-400`}>
        Erro ao carregar
      </span>
      <p className={`text-center text-red-400/70 mt-1 max-w-xs ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
