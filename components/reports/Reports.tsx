import React from 'react';
import { TrendingUp, Briefcase, Loader2, BarChart3 } from 'lucide-react';
import { useDeals } from '../../hooks/useDeals';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DealStage } from '../../types/deals';

const STAGES: DealStage[] = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

export default function Reports() {
  const { allDeals, loading } = useDeals();

  const stageCounts = STAGES.map(stage => ({
    stage,
    label: DEAL_STAGE_LABELS[stage],
    color: DEAL_STAGE_COLORS[stage],
    count: allDeals.filter(d => d.stage === stage).length,
    total: allDeals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0),
  }));

  const totalPipeline = allDeals.reduce((s, d) => d.stage !== 'closed_lost' ? s + d.value : s, 0);
  const totalWon = allDeals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + d.value, 0);
  const totalLost = allDeals.filter(d => d.stage === 'closed_lost').reduce((s, d) => s + d.value, 0);
  const avgTicket = allDeals.length > 0 ? totalWon / allDeals.length : 0;
  const conversionRate = allDeals.length > 0
    ? Math.round((allDeals.filter(d => d.stage === 'closed_won').length / allDeals.length) * 100)
    : 0;

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0">
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
          <BarChart3 size={24} className="text-brand-500" />
          Relatórios
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-brand-500" size={32} /></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Pipeline Total" value={fmt(totalPipeline)} color="text-brand-600" />
              <KpiCard label="Fechados (Ganhos)" value={fmt(totalWon)} color="text-emerald-600" />
              <KpiCard label="Fechados (Perdidos)" value={fmt(totalLost)} color="text-red-500" />
              <KpiCard label="Ticket Médio" value={fmt(avgTicket)} color="text-blue-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <KpiCard label="Total de Negócios" value={String(allDeals.length)} color="text-slate-800 dark:text-white" />
              <KpiCard label="Taxa de Conversão" value={`${conversionRate}%`} color="text-brand-600" />
            </div>

            {/* Funnel */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-widest mb-6">Funil de Vendas</h3>
              <div className="space-y-4">
                {stageCounts.map(s => {
                  const maxCount = Math.max(...stageCounts.map(x => x.count), 1);
                  const widthPct = Math.round((s.count / maxCount) * 100);
                  return (
                    <div key={s.stage}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{s.label}</span>
                        <span className="text-slate-500">{s.count} negócios · {fmt(s.total)}</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage breakdown table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-850">
                  <tr>
                    <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-[0.2em]">Estágio</th>
                    <th className="text-right px-6 py-4 font-black text-slate-400 uppercase tracking-[0.2em]">Qtd</th>
                    <th className="text-right px-6 py-4 font-black text-slate-400 uppercase tracking-[0.2em]">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {stageCounts.map(s => (
                    <tr key={s.stage}>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.color}`} />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{s.label}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">{s.count}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">{fmt(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
