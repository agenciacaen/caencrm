import React from 'react';
import {
  Search, Menu, Loader2, MapPin, Filter, Globe,
  Phone, ExternalLink, UserPlus, AlertCircle,
} from 'lucide-react';
import { useMenuToggle } from '../contexts/MenuContext';
import { useToast } from '../contexts/ToastContext';
import { useProspecting } from '../hooks/useProspecting';

const Prospecting: React.FC = () => {
  const { toggleSidebar } = useMenuToggle();
  const { success, error: toastError } = useToast();
  const {
    results, loading, error, total, hasMore, importingId, filters,
    query, location, setQuery, setLocation, toggleFilter,
    search, loadMore, importContact, clearResults,
  } = useProspecting();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    search();
  };

  const handleImport = async (prospect: any) => {
    try {
      await importContact(prospect);
      success('Contato importado', `${prospect.name} foi adicionado ao Chatwoot.`);
    } catch (err) {
      toastError('Erro ao importar', err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            <Menu size={20} />
          </button>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <Search size={24} className="text-brand-500" />
            Central de Prospecção
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 no-scrollbar">
        <form onSubmit={handleSearch}>
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              Encontre novos leads qualificados
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Ex: Clínicas Odontológicas"
                  value={query}
                  onChange={e => { setQuery(e.target.value); if (error) clearResults(); }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Ex: São Paulo, SP"
                  value={location}
                  onChange={e => { setLocation(e.target.value); if (error) clearResults(); }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-slate-950 dark:bg-brand-500 text-white dark:text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 hover:text-slate-950 dark:hover:bg-brand-600 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {loading ? 'Buscando...' : 'Buscar Prospectos'}
              </button>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <Filter size={14} className="text-brand-500" />
              <span>Filtros avançados:</span>
              <button
                type="button"
                onClick={() => toggleFilter('hasWebsite')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                  filters.hasWebsite
                    ? 'bg-brand-500/10 border-brand-500 text-brand-500 dark:text-brand-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                }`}
              >
                Apenas com Site
              </button>
              <button
                type="button"
                onClick={() => toggleFilter('hasPhone')}
                className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                  filters.hasPhone
                    ? 'bg-brand-500/10 border-brand-500 text-brand-500 dark:text-brand-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                }`}
              >
                Apenas com WhatsApp
              </button>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed">
                Avaliação &gt; 4.0
              </span>
            </div>
          </div>
        </form>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-xs font-semibold text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && results.length === 0 && total === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Resultados da Exploração (0)
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 border-dashed">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <Globe size={32} className="text-slate-200 dark:text-slate-600" />
              </div>
              <p className="text-base font-black text-slate-400 uppercase tracking-widest">Nenhum resultado disponível</p>
              <p className="text-xs text-slate-400 max-w-sm text-center mt-3 font-medium leading-relaxed">
                Utilize os filtros acima para escanear a web em busca de empresas e leads que combinam com seu ICP.
              </p>
            </div>
          </div>
        )}

        {loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Loader2 size={32} className="animate-spin text-brand-500 mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Buscando prospectos...</p>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">A consulta pode levar alguns segundos.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Resultados da Exploração ({total})
              </h3>
              <button
                onClick={clearResults}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest transition-colors"
              >
                Limpar
              </button>
            </div>

            <div className="grid gap-4">
              {results.map((prospect) => (
                <div
                  key={prospect.osmId}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4 hover:border-brand-500/30 transition-all"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {prospect.name}
                      </h4>
                      {prospect.category && (
                        <span className="px-2 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          {prospect.category}{prospect.type ? ` › ${prospect.type}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2">
                      {prospect.address}
                    </p>
                    <div className="flex items-center gap-4 pt-1">
                      {prospect.phone && (
                        <a
                          href={`tel:${prospect.phone}`}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-brand-500 transition-colors"
                        >
                          <Phone size={12} />
                          {prospect.phone}
                        </a>
                      )}
                      {prospect.website && (
                        <a
                          href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-brand-500 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleImport(prospect)}
                    disabled={importingId === prospect.osmId}
                    className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-500/20 disabled:cursor-not-allowed"
                  >
                    {importingId === prospect.osmId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <UserPlus size={14} />
                    )}
                    {importingId === prospect.osmId ? 'Importando...' : 'Importar como Contato'}
                  </button>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  Carregar mais resultados
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Prospecting;
