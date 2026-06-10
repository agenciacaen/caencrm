import React, { useState } from 'react';
import { RefreshCw, Loader2, Check } from 'lucide-react';
import { syncAll } from '../api/sync';

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setDone(false);
    try {
      const result = await syncAll();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
    >
      {syncing ? (
        <Loader2 size={14} className="animate-spin" />
      ) : done ? (
        <Check size={14} className="text-green-500" />
      ) : (
        <RefreshCw size={14} />
      )}
      {syncing ? 'Sincronizando...' : done ? 'Sincronizado!' : 'Sincronizar Chatwoot'}
    </button>
  );
}
