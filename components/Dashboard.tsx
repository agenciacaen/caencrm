import React, { useState } from 'react';
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
  Loader2,
  DollarSign,
  PieChart,
  Target,
  BarChart3,
  XCircle,
  CheckCircle2,
  Clock,
  Banknote,
  Percent,
  Briefcase,
  MessageSquare,
  Users,
  TicketCheck,
  Timer
} from 'lucide-react';
import { KPI, SalesMetric, Stage } from '../types';
import { useChatwootApi } from '../hooks/useChatwootApi';
import chatwootAPI from '../api/chatwoot';
import { useDeals } from '../hooks/useDeals';
import { ChatwootAccountSummary } from '../types/chatwoot';
import { useMenuToggle } from '../contexts/MenuContext';
import type { DealStage } from '../types/deals';

type DashboardTab = 'vendas' | 'atendimento';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useMenuToggle();
  const [activeTab, setActiveTab] = useState<DashboardTab>('vendas');

  const thirtyDaysAgo = Math.floor(Date.now() / 1000 - 30 * 24 * 60 * 60).toString();
  const now = Math.floor(Date.now() / 1000).toString();

  const { data: summary, loading: summaryLoading, error: summaryError, refetch } = useChatwootApi<ChatwootAccountSummary>(
    () => chatwootAPI.reports.summary({ since: thirtyDaysAgo, until: now }),
    []
  );

  const { allDeals, loading: dealsLoading } = useDeals();

  const formatTime = (seconds: string | number | undefined) => {
    if (!seconds) return '0s';
    const num = Number(seconds);
    if (num < 60) return `${Math.floor(num)}s`;
    const mins = Math.floor(num / 60);
    const secs = Math.floor(num % 60);
    return `${mins}m ${secs}s`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Sales metrics from real deal data
  const deals = allDeals || [];
  const totalDeals = deals.length;
  const dealsWon = deals.filter(d => d.stage === 'closed_won');
  const dealsLost = deals.filter(d => d.stage === 'closed_lost');
  const dealsInProgress = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));
  const revenueWon = dealsWon.reduce((sum, d) => sum + d.value, 0);
  const revenueLost = dealsLost.reduce((sum, d) => sum + d.value, 0);
  const revenueInProgress = dealsInProgress.reduce((sum, d) => sum + d.value, 0);
  const avgTicket = dealsWon.length > 0 ? revenueWon / dealsWon.length : 0;
  const conversionRate = (dealsWon.length + dealsLost.length) > 0
    ? (dealsWon.length / (dealsWon.length + dealsLost.length)) * 100
    : 0;

  const serviceKpis: KPI[] = [
    { 
      label: 'Conversas (30d)', 
      value: summary ? summary.conversations_count.toString() : '0', 
      status: 'Online', 
      subtext: `Anterior: ${summary?.previous?.conversations_count || 0}`, 
      icon: <MessageSquare size={16} />, 
      iconBgColor: 'bg-emerald-100', 
      iconColor: 'text-emerald-600' 
    },
    { 
      label: 'Resoluções', 
      value: summary ? summary.resolutions_count.toString() : '0', 
      status: 'Ativo', 
      subtext: `Anterior: ${summary?.previous?.resolutions_count || 0}`, 
      icon: <TicketCheck size={16} />, 
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
      icon: <Timer size={16} />, 
      iconBgColor: 'bg-indigo-100', 
      iconColor: 'text-indigo-600' 
    },
  ];

  const salesKpis: KPI[] = [
    {
      label: 'Receita Ganha',
      value: formatCurrency(revenueWon),
      status: 'Ativo',
      subtext: `${dealsWon.length} negócios fechados`,
      icon: <CheckCircle2 size={16} />,
      iconBgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Receita Perdida',
      value: formatCurrency(revenueLost),
      subtext: `${dealsLost.length} negócios perdidos`,
      icon: <XCircle size={16} />,
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-500',
    },
    {
      label: 'Em Andamento',
      value: formatCurrency(revenueInProgress),
      subtext: `${dealsInProgress.length} negociações abertas`,
      icon: <Clock size={16} />,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Total de Negociações',
      value: totalDeals.toString(),
      subtext: `${dealsInProgress.length} em andamento`,
      icon: <Briefcase size={16} />,
      iconBgColor: 'bg-brand-100',
      iconColor: 'text-brand-600',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(avgTicket),
      subtext: avgTicket > 0 ? 'Média dos negócios ganhos' : 'Nenhum negócio ganho',
      icon: <Banknote size={16} />,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Taxa de Conversão',
      value: formatPercent(conversionRate),
      subtext: `${dealsWon.length} ganhos / ${dealsWon.length + dealsLost.length} fechados`,
      icon: <Percent size={16} />,
      iconBgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  const stageMetrics: Stage[] = [
    { label: 'Prospecção', count: deals.filter(d => d.stage === 'prospecting').length, percentage: totalDeals > 0 ? Math.round(deals.filter(d => d.stage === 'prospecting').length / totalDeals * 100) : 0, color: 'bg-slate-500', width: `${totalDeals > 0 ? (deals.filter(d => d.stage === 'prospecting').length / totalDeals * 100) : 0}%` },
    { label: 'Qualificação', count: deals.filter(d => d.stage === 'qualification').length, percentage: totalDeals > 0 ? Math.round(deals.filter(d => d.stage === 'qualification').length / totalDeals * 100) : 0, color: 'bg-indigo-500', width: `${totalDeals > 0 ? (deals.filter(d => d.stage === 'qualification').length / totalDeals * 100) : 0}%` },
    { label: 'Proposta', count: deals.filter(d => d.stage === 'proposal').length, percentage: totalDeals > 0 ? Math.round(deals.filter(d => d.stage === 'proposal').length / totalDeals * 100) : 0, color: 'bg-pink-500', width: `${totalDeals > 0 ? (deals.filter(d => d.stage === 'proposal').length / totalDeals * 100) : 0}%` },
    { label: 'Negociação', count: deals.filter(d => d.stage === 'negotiation').length, percentage: totalDeals > 0 ? Math.round(deals.filter(d => d.stage === 'negotiation').length / totalDeals * 100) : 0, color: 'bg-emerald-500', width: `${totalDeals > 0 ? (deals.filter(d => d.stage === 'negotiation').length / totalDeals * 100) : 0}%` },
    { label: 'Fechado (Ganho)', count: dealsWon.length, percentage: totalDeals > 0 ? Math.round(dealsWon.length / totalDeals * 100) : 0, color: 'bg-green-600', width: `${totalDeals > 0 ? (dealsWon.length / totalDeals * 100) : 0}%` },
    { label: 'Fechado (Perdido)', count: dealsLost.length, percentage: totalDeals > 0 ? Math.round(dealsLost.length / totalDeals * 100) : 0, color: 'bg-red-500', width: `${totalDeals > 0 ? (dealsLost.length / totalDeals * 100) : 0}%` },
  ];

  const activeKpis = activeTab === 'vendas' ? salesKpis : serviceKpis;
  const loading = activeTab === 'vendas' ? dealsLoading : summaryLoading;
  const error = activeTab === 'vendas' ? null : summaryError;

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-slate-600 dark:text-slate-300"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard Caen</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {activeTab === 'vendas' ? 'Funil de Vendas — Métricas Comerciais' : 'Atendimento — Métricas de Suporte'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refetch} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 mt-5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('vendas')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'vendas'
                ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 size={16} />
            Funil de Vendas
          </button>
          <button
            onClick={() => setActiveTab('atendimento')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'atendimento'
                ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare size={16} />
            Atendimento
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 no-scrollbar">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {error ? (
            <div className="col-span-full text-center text-red-500 text-xs font-bold p-4 bg-red-50 dark:bg-red-950/20 rounded-xl">Erro ao carregar KPIs: {error}</div>
          ) : (
            activeKpis.map((kpi, idx) => (
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
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold ${kpi.status === 'Online' || kpi.status === 'Ativo' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'} px-2 py-1 rounded-lg`}>
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

        {/* Sales Funnel - only show on vendas tab */}
        {activeTab === 'vendas' && (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <Layers size={16} className="text-indigo-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-widest">Funil de Vendas</h3>
              </div>
              <div className="p-6 space-y-5">
                {stageMetrics.filter(s => s.count > 0).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 font-semibold">Nenhum negócio cadastrado ainda</p>
                ) : (
                  stageMetrics.map((stage, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-[11px] mb-2">
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{stage.label}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">{stage.count} ({stage.percentage}%)</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${stage.color} rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: stage.width }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <button onClick={() => navigate('/deals')} className="px-8 py-3 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest">
                Gerenciar Negócios
              </button>
            </div>
          </>
        )}

        {/* Service metrics - only show on atendimento tab */}
        {activeTab === 'atendimento' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
              <Activity size={16} className="text-brand-500" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-widest">Métricas de Atendimento</h3>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              <div className="text-center p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{summary?.conversations_count || 0}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter mt-1">Conversas</p>
              </div>
              <div className="text-center p-5 bg-brand-50 dark:bg-brand-500/10 rounded-2xl border border-brand-100 dark:border-brand-500/20">
                <p className="text-2xl font-extrabold text-brand-700 dark:text-brand-400">{summary?.resolutions_count || 0}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter mt-1">Resoluções</p>
              </div>
              <div className="text-center p-5 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{summary ? `${summary.incoming_messages_count} / ${summary.outgoing_messages_count}` : '0 / 0'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter mt-1">Msgs In/Out</p>
              </div>
              <div className="text-center p-5 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{summary ? formatTime(summary.avg_first_response_time) : '0s'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter mt-1">Tempo Resp.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
