import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export default function LoadingState({ message = 'Carregando...', compact }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-[#889096] ${compact ? 'py-8' : 'py-16'}`}>
      <Loader2 className="animate-spin mb-2" size={compact ? 16 : 24} />
      <span className={`font-bold text-center ${compact ? 'text-[10px] uppercase tracking-widest' : 'text-xs uppercase tracking-widest'}`}>
        {message}
      </span>
    </div>
  );
}
