import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AccountSelector() {
  const { accounts, selectAccount } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const activeAccounts = accounts.filter(a => a.status === 'active');

  const handleSelect = async (account: typeof activeAccounts[0]) => {
    setLoading(true);
    selectAccount(account);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 space-y-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand-500 shadow-lg shadow-brand-500/20">
              <Zap className="text-slate-950 fill-slate-950" size={28} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Selecione a Empresa</h1>
              <p className="text-sm text-slate-400 font-medium">Escolha qual conta acessar</p>
            </div>
          </div>

          <div className="space-y-3">
            {activeAccounts.length === 0 && (
              <p className="text-sm text-slate-400 text-center">Nenhuma conta ativa disponível</p>
            )}

            {activeAccounts.map(account => (
              <button
                key={account.id}
                onClick={() => handleSelect(account)}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-750 hover:bg-slate-700 border border-slate-700 hover:border-brand-500/30 rounded-2xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20 transition-all">
                  <Building2 size={20} className="text-brand-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">{account.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium">ID: {account.id}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500" title={account.status} />
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-brand-500" size={20} />
            </div>
          )}

          <p className="text-[10px] text-center text-slate-600 font-medium">
            CaenCRM v1.0 — Agência Caen
          </p>
        </div>
      </div>
    </div>
  );
}
