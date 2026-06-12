import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useToast, type Toast } from '../contexts/ToastContext';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/10 border-red-500/20 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
};

const borderAccent = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = iconMap[toast.type];

  return (
    <div
      className={`
        w-full max-w-sm bg-slate-900 border border-slate-800 border-l-4 ${borderAccent[toast.type]}
        rounded-2xl shadow-2xl p-4 flex items-start gap-3
        animate-slide-up pointer-events-auto
      `}
      role="alert"
    >
      <div className={`p-1.5 rounded-lg shrink-0 ${colorMap[toast.type]}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white">{toast.title}</p>
        {toast.message && (
          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-all shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-h-screen overflow-hidden">
      {toasts.map(toast => (
        <React.Fragment key={toast.id}>
          <ToastItem toast={toast} onDismiss={() => removeToast(toast.id)} />
        </React.Fragment>
      ))}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateX(100%) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
