import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, AlertCircle } from 'lucide-react';
import type { Appointment, AppointmentFormData, AppointmentStatus } from '../types';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AppointmentFormData) => Promise<void>;
  appointment?: Appointment | null;
  initialDate?: string;
}

const STATUS_OPTIONS: AppointmentStatus[] = ['Confirmado', 'Pendente', 'Cancelado', 'Concluído'];

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  appointment,
  initialDate,
}) => {
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('Pendente');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        setName(appointment.name);
        setService(appointment.service);
        setDate(appointment.date);
        setTime(appointment.time);
        setStatus(appointment.status);
      } else {
        setName('');
        setService('');
        setDate(initialDate || new Date().toISOString().split('T')[0]);
        setTime('09:00');
        setStatus('Pendente');
      }
      setSubmitError(null);
    }
  }, [isOpen, appointment, initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !service.trim() || !date || !time) {
      setSubmitError('Preencha todos os campos obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave({ name: name.trim(), service: service.trim(), date, time, status });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const now = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-850 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {appointment ? 'Altere os dados do agendamento' : 'Preencha os dados do agendamento'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">
            {submitError && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Erro</p>
                  <p className="text-[11px] opacity-90 mt-1">{submitError}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Parceiro / Lead *
              </label>
              <input
                type="text"
                placeholder="Ex: Maria Santos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Serviço *
              </label>
              <input
                type="text"
                placeholder="Ex: Estratégia CaenCRM"
                value={service}
                onChange={(e) => setService(e.target.value)}
                required
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Data *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={now}
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Hora *
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatus(opt)}
                    className={`p-3.5 border text-[11px] font-bold rounded-2xl transition-all ${
                      status === opt
                        ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50/50 dark:hover:bg-slate-950 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-slate-950 dark:bg-brand-500 text-white dark:text-slate-950 rounded-2xl text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-brand-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    {appointment ? 'Atualizar' : 'Criar Agendamento'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
