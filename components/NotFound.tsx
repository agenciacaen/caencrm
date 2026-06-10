import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-extrabold text-brand-500">404</h1>
        <p className="text-slate-400 text-lg font-medium">Página não encontrada</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-slate-950 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20"
        >
          <Home size={16} />
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}
