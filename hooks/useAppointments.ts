import { useState, useCallback, useEffect } from 'react';
import type { Appointment, AppointmentFormData, AppointmentStatus } from '../types';

const STORAGE_KEY = 'caencrm_appointments';

function loadFromStorage(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveToStorage(data: Appointment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId(): string {
  return `apt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface UseAppointmentsReturn {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  createAppointment: (data: AppointmentFormData) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<AppointmentFormData>) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointmentsByDate: (date: string) => Appointment[];
  getAppointmentsByMonth: (year: number, month: number) => Appointment[];
  refetch: () => void;
}

export function useAppointments(): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>(loadFromStorage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saveToStorage(appointments);
  }, [appointments]);

  const refetch = useCallback(() => {
    setAppointments(loadFromStorage());
  }, []);

  const createAppointment = useCallback(async (data: AppointmentFormData): Promise<Appointment> => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 200));
      const appointment: Appointment = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAppointments(prev => [...prev, appointment]);
      return appointment;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar agendamento';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAppointment = useCallback(async (id: string, data: Partial<AppointmentFormData>): Promise<Appointment> => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 200));
      let updated: Appointment | undefined;
      setAppointments(prev => {
        const next = prev.map(a => {
          if (a.id === id) {
            updated = { ...a, ...data, updatedAt: new Date().toISOString() };
            return updated;
          }
          return a;
        });
        return next;
      });
      if (!updated) throw new Error('Agendamento não encontrado');
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar agendamento';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 200));
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir agendamento';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAppointmentsByDate = useCallback((date: string): Appointment[] => {
    return appointments.filter(a => a.date === date);
  }, [appointments]);

  const getAppointmentsByMonth = useCallback((year: number, month: number): Appointment[] => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return appointments.filter(a => a.date.startsWith(prefix));
  }, [appointments]);

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByDate,
    getAppointmentsByMonth,
    refetch,
  };
}

export default useAppointments;
