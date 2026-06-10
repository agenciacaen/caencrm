import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Menu, Plus,
  ChevronLeft, ChevronRight, Pencil, Trash2, AlertTriangle,
  Loader2, LayoutList, LayoutGrid,
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay, isToday, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMenuToggle } from '../contexts/MenuContext';
import { useAppointments } from '../hooks/useAppointments';
import MonthCalendar from './MonthCalendar';
import AppointmentModal from './AppointmentModal';
import type { Appointment, AppointmentFormData } from '../types';

type ViewMode = 'table' | 'calendar';

const STATUS_COLORS: Record<string, string> = {
  Confirmado: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800',
  Pendente: 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800',
  Cancelado: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800',
  Concluído: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
};

const DAY_LABELS: Record<string, string> = {
  '0': 'Dom',
  '1': 'Seg',
  '2': 'Ter',
  '3': 'Qua',
  '4': 'Qui',
  '5': 'Sex',
  '6': 'Sáb',
};

function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  if (isSameDay(d, today)) return 'Hoje';
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d, tomorrow)) return 'Amanhã';
  return format(d, "d MMM", { locale: ptBR });
}

function getWeekDates(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const Appointments: React.FC = () => {
  const { toggleSidebar } = useMenuToggle();
  const {
    appointments,
    loading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByDate,
    getAppointmentsByMonth,
  } = useAppointments();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [initialDate, setInitialDate] = useState<string>('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const monthAppointmentDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const monthAppts = getAppointmentsByMonth(year, month);
    return [...new Set(monthAppts.map(a => a.date))];
  }, [currentMonth, getAppointmentsByMonth]);

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  const dayAppointments = useMemo(() => {
    return getAppointmentsByDate(selectedDateStr);
  }, [selectedDateStr, getAppointmentsByDate]);

  const weekStats = useMemo(() => {
    const { start, end } = getWeekDates();
    const weekAppts = appointments.filter(a => {
      const d = new Date(a.date + 'T12:00:00');
      return d >= start && d <= end;
    });
    const total = weekAppts.length;
    const efectivados = weekAppts.filter(a => a.status === 'Confirmado' || a.status === 'Concluído').length;
    const noShow = weekAppts.filter(a => a.status === 'Cancelado').length;
    return { total, efectivados, noShow, pendentes: total - efectivados - noShow };
  }, [appointments]);

  const nextAppointment = useMemo(() => {
    const now = startOfDay(new Date());
    const sorted = [...appointments]
      .filter(a => {
        const d = new Date(a.date + 'T' + a.time);
        return isAfter(d, now) || isSameDay(d, now);
      })
      .sort((a, b) => {
        const da = new Date(a.date + 'T' + a.time);
        const db = new Date(b.date + 'T' + b.time);
        return da.getTime() - db.getTime();
      });
    return sorted[0] || null;
  }, [appointments]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setViewMode('table');
  }, []);

  const handleNewAppointment = useCallback((date?: Date) => {
    if (date) setInitialDate(format(date, 'yyyy-MM-dd'));
    else setInitialDate(todayStr);
    setEditingAppointment(null);
    setModalOpen(true);
  }, [todayStr]);

  const handleEditAppointment = useCallback((appt: Appointment) => {
    setEditingAppointment(appt);
    setInitialDate(appt.date);
    setModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteAppointment(deletingId);
    } catch {}
    setDeletingId(null);
  }, [deletingId, deleteAppointment]);

  const handleSave = useCallback(async (data: AppointmentFormData) => {
    if (editingAppointment) {
      await updateAppointment(editingAppointment.id, data);
    } else {
      await createAppointment(data);
    }
  }, [editingAppointment, updateAppointment, createAppointment]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            <Menu size={20} />
          </button>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <CalendarIcon size={24} className="text-brand-500" />
            Agenda Caen
          </h1>
        </div>
        <button
          onClick={() => handleNewAppointment()}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest"
        >
          <Plus size={16} />
          Novo Agendamento
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* Controls Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-6">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-400 transition-all">
                  <ChevronLeft size={18} />
                </button>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-400 transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 shadow-md text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutList size={14} />
                  Tabela
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-white dark:bg-slate-700 shadow-md text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid size={14} />
                  Calendário
                </button>
              </div>
            </div>

            {/* Content */}
            {viewMode === 'calendar' ? (
              <MonthCalendar
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                appointmentDates={monthAppointmentDates}
                onSelectDate={handleSelectDate}
                onNewAppointment={handleNewAppointment}
              />
            ) : (
              /* Table View */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Agendamentos — {formatDateBR(selectedDateStr)}
                  </h4>
                  <button
                    onClick={() => handleNewAppointment()}
                    className="flex items-center gap-1 text-[10px] font-black text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 uppercase tracking-widest transition-all"
                  >
                    <Plus size={14} />
                    Novo
                  </button>
                </div>
                {loading && dayAppointments.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 className="animate-spin mr-3 text-brand-500" size={24} />
                    <span className="text-xs font-bold uppercase tracking-wider">Carregando...</span>
                  </div>
                ) : dayAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                    <CalendarIcon size={40} className="mb-3 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">Nenhum agendamento</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600">Clique em "Novo Agendamento" para criar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Parceiro / Lead</th>
                          <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Objetivo</th>
                          <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Cronograma</th>
                          <th className="text-left px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Estado</th>
                          <th className="text-right px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dayAppointments.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-2xl bg-slate-950 flex items-center justify-center text-[11px] font-black text-white uppercase shadow-lg shadow-slate-950/10">
                                  {item.name.substring(0, 2)}
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-slate-500 dark:text-slate-400 font-medium">{item.service}</td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{item.time}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[item.status] || STATUS_COLORS.Pendente}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditAppointment(item)}
                                  className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingId(item.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-6">
            {/* Eficiência Semanal */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-6">Eficiência Semanal</h4>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">Previstos</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">{weekStats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">Efetivados</span>
                  <span className="font-black text-emerald-600">{weekStats.efectivados}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">Pendentes</span>
                  <span className="font-black text-brand-500">{weekStats.pendentes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">No-show</span>
                  <span className="font-black text-red-500">{weekStats.noShow}</span>
                </div>
              </div>
            </div>

            {/* Próximo na Fila */}
            <div className="bg-slate-950 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <Clock size={16} className="text-brand-400" />
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-brand-400">Próximo na Fila</h3>
                </div>
                {nextAppointment ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-white">{nextAppointment.time}</p>
                    <p className="text-xs font-bold text-slate-300">{nextAppointment.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{nextAppointment.service}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] text-slate-500 font-black uppercase">{formatDateBR(nextAppointment.date)}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${STATUS_COLORS[nextAppointment.status] || ''}`}>
                        {nextAppointment.status}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-lg font-black text-slate-500">Nenhum</p>
                    <p className="text-[10px] text-slate-600 font-medium">Nenhum agendamento pendente</p>
                  </div>
                )}
                <button className="w-full mt-6 py-3 bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-black/20">
                  Sala de Reunião
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        appointment={editingAppointment}
        initialDate={initialDate}
      />

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-850 shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">Excluir Agendamento</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-6">
                Tem certeza que deseja excluir este agendamento?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-5 py-3 bg-red-500 text-white rounded-2xl text-xs font-extrabold hover:bg-red-600 transition-all uppercase tracking-widest"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;