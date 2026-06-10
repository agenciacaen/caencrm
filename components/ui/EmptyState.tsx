import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nenhum dado encontrado',
  message,
  action,
  compact,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-[#889096] ${compact ? 'py-8' : 'py-16'}`}>
      <Icon size={compact ? 28 : 40} className="mb-3 opacity-30" />
      <span className={`font-bold text-center ${compact ? 'text-xs uppercase tracking-widest' : 'text-sm uppercase tracking-widest'} text-[#eceef0]`}>
        {title}
      </span>
      {message && (
        <p className={`text-center text-[#687076] mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {message}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-[#0091ff] hover:bg-[#007cdb] text-white text-xs font-bold rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
