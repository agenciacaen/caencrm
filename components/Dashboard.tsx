import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, 
  Menu, 
  Phone, 
  Send, 
  Zap, 
  Radio, 
  TrendingUp, 
  Activity, 
  Layers, 
  ChevronDown,
  Circle,
  Loader2
} from 'lucide-react';
import { KPI, SalesMetric, Seller, Stage } from '../types';
import { useChatwootApi } from '../hooks/useChatwootApi';
import chatwootAPI from '../api/chatwoot';
import { ChatwootAccountSummary } from '../types/chatwoot';
import { useMenuToggle } from '../contexts/MenuContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useMenuToggle();
  const thirtyDaysAgo = Math.floor(Date.now() / 1000 - 30 * 24 * 60 * 60).toString();
  const now = Math.floor(Date.now() / 1000).toString();

  const { data: summary, loading, error, refetch } = useChatwootApi<ChatwootAccountSummary>(
    () => chatwootAPI.reports.summary({ since: thirtyDaysAgo, until: now }),
    []
  );

  const formatTime = (seconds: string | number | undefined) => {
    if (!seconds) return '0s';
    const num = Number(seconds);
    if (num < 60) return `${Math.floor(num)}s`;
    const mins = Math.floor(num / 60);
    const secs = Math.floor(num % 60);
    return `${mins}m ${secs}s`;
  };

  const kpis: KPI[] = [
    { 
      label: 'Conversas (30d)', 
      value: summary ? summary.conversations_count.toString() : '0', 
      status: 'Online', 
      subtext: `Anterior: ${summary?.previous?.conversations_count || 0}`, 
      icon: <Phone size={16} />, 
      iconBgColor: 'bg-emerald-100', 
      iconColor: 'text-emerald-600' 
    },
    { 
      label: 'Resoluções', 
      value: summary ? summary.resolutions_count.toString() : '0', 
      status: 'Ativo', 
      subtext: `Anterior: ${summary?.previous?.resolutions_count || 0}`, 
      icon: <Send size={16} />, 
      iconBgColor: 'bg-brand-100', 
      iconColor: 'text-brand-600' 
    },
    { 
      label: 'Mensagens In / Out', 
      value: summary ? `${summary.incoming_messages_count} / ${summary.outgoing_messages_count}` : '0 / 0', 
      subtext: 'Volume total', 
      icon: <Zap size={16} />, 
      iconBgColor: 'bg-brand-500/10', 
      iconColor: 'text-brand-600' 
    },
    { 
      label: 'Tempo Resp. Médio', 
      value: summary ? formatTime(summary.avg_first_response_time) : '0s', 
      status: 'Online', 
      subtext: `Anterior: ${formatTime(summary?.previous?.avg_first_response_time)}`, 
      icon: <Radio size={16} />, 
      iconBgColor: 'bg-indigo-100', 
      iconColor: 'text-indigo-600' 
    },
  ];

  const salesMetrics: SalesMetric[] = [
    { label: 'Receita Ganha', value: 'R$ 127K', subtext: 'Alta performance', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10', textColor: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-emerald-100 dark:border-emerald-500/20' },
    { label: 'Receita Perdida', value: 'R$ 0', subtext: 'Taxa 0%', bgColor: 'bg-red-50 dark:bg-red-500/10', textColor: 'text-red-500 dark:text-red-400', borderColor: 'border-red-100 dark:border-red-500/20' },
    { label: 'Em Aberto', value: 'R$ 331', subtext: '80 Negociações', bgColor: 'bg-brand-50 dark:bg-brand-500/10', textColor: 'text-brand-700 dark:text-brand-400', borderColor: 'border-brand-100 dark:border-brand-500/20' },
    { label: 'Ticket Médio', value: 'R$ 1.4K', subtext: 'Segmento A+', bgColor: 'bg-blue-50 dark:bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-100 dark:border-blue-500/20' },
    { label: 'Conversão', value: '34.2%', subtext: 'Acima do mercado', bgColor: 'bg-brand-500/10 dark:bg-brand-500/20', textColor: 'text-brand-700 dark:text-brand-400', borderColor: 'border-brand-500/20 dark:border-brand-500/30' },
    { label: 'Novas', value: '135', subtext: 'Última semana', bgColor: 'bg-slate-50 dark:bg-slate-800', textColor: 'text-slate-700 dark:text-slate-300', borderColor: 'border-slate-200 dark:border-slate-700' },
    { label: 'Interações', value: '4.2K', subtext: 'IA operando', bgColor: 'bg-slate-50 dark:bg-slate-800', textColor: 'text-slate-700 dark:text-slate-300', borderColor: 'border-slate-200 dark:border-slate-700' },
  ];

  const stages: Stage[] = [
    { label: 'Novas Oportunidades', count: 50, percentage: 39, color: 'bg-brand-400', width: '97.5%' },
    { label: 'Qualificação IA', count: 28, percentage: 22, color: 'bg-brand-500', width: '55%' },
    { label: 'Aguardando Consultor', count: 21, percentage: 16, color: 'bg-slate-800 dark:bg-slate-700', width: '40%' },
    { label: 'Reunião Agendada', count: 16, percentage: 13, color: 'bg-emerald-500', width: '32.5%' },
  ];

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-850 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-slate-600 dark:text-slate-300"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard Caen</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Performance e Inteligência de Vendas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group hidden sm:block">
              <select className="appearance-none text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all">
                <option>Últimos 30 dias</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button onClick={refetch} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 no-scrollbar">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {error ? (
            <div className="col-span-4 text-center text-red-500 text-xs font-bold p-4 bg-red-50 dark:bg-red-950/20 rounded-xl">Erro ao carregar KPIs: {error}</div>
          ) : (
            kpis.map((kpi, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 shadow-sm hover:shadow-xl dark:hover:shadow-slate-950/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                {loading && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="animate-spin text-brand-500" size={24} />
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 ${kpi.iconBgColor} rounded-xl flex items-center justify-center ${kpi.iconColor}`}>
                    {kpi.icon}
                  </div>
                  {kpi.status && (
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold ${kpi.status === 'Online' || kpi.status === 'Ativo' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 dark:bg-slate-800'} px-2 py-1 rounded-lg`}>
                      <Circle size={6} className="fill-current" />
                      {kpi.status}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                <p className="text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white">{kpi.value}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium mt-1">{kpi.subtext}</p>
              </div>
            ))
          )}
        </div>

        {/* Sales Performance */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 relative">
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 pointer-events-none group hover:bg-transparent">
            <span className="bg-slate-900 dark:bg-slate-950 text-white dark:text-slate-100 px-4 py-2 rounded-xl text-xs font-bold shadow-xl transition-all group-hover:opacity-0">Dados de Receita Mockados (Futuro Módulo CRM)</span>
          </div>
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
            <TrendingUp size={16} className="text-brand-500" />
            <h2 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-widest">Análise de Performance Global</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 lg:gap-4">
              {salesMetrics.map((metric, idx) => (
                <div key={idx} className={`text-center p-4 ${metric.bgColor} rounded-2xl border ${metric.borderColor} hover:border-brand-500/50 transition-all cursor-default`}>
                  <p className={`text-lg font-extrabold ${metric.textColor}`}>{metric.value}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter mt-1">{metric.label}</p>
                  <span className={`text-[9px] ${metric.textColor} opacity-80 font-medium`}>{metric.subtext}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts and Lists */}
        <div className="grid lg:grid-cols-3 gap-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
              <Activity size={16} className="text-brand-500" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-widest">Evolução Diária</h3>
            </div>
            <div className="p-6">
              <div className="h-48 flex items-end justify-between gap-2 lg:gap-3">
                {[35, 42, 38, 55, 48, 62, 45, 70, 58, 80, 65, 75, 40, 55, 60].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group">
                    <div 
                      className="w-full bg-brand-500/20 rounded-t-lg group-hover:bg-brand-500 transition-all duration-300 cursor-pointer relative" 
                      style={{ height: `${h}%` }}
                    >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-950 text-white text-[8px] px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all">
                            {h}%
                        </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-400 mt-4 font-bold uppercase tracking-wider">
                <span>Início do Mês</span>
                <span>Tempo Real</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
              <Layers size={16} className="text-indigo-500" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-widest">Gargalos do Funil</h3>
            </div>
            <div className="p-6 space-y-6">
              {stages.map((stage, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-[11px] mb-2">
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{stage.label}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{stage.count} leads ({stage.percentage}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stage.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: stage.width }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <button onClick={() => navigate('/reports')} className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                  Ver Relatório Completo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;