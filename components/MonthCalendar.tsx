import React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthCalendarProps {
  currentMonth: Date;
  selectedDate: Date | null;
  appointmentDates: string[];
  onSelectDate: (date: Date) => void;
  onNewAppointment: (date: Date) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MonthCalendar: React.FC<MonthCalendarProps> = ({
  currentMonth,
  selectedDate,
  appointmentDates,
  onSelectDate,
  onNewAppointment,
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="px-2 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800"
          >
            {wd}
          </div>
        ))}
        {days.map((day) => {
          const sameMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasAppointment = appointmentDates.includes(dateStr);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              onDoubleClick={() => onNewAppointment(day)}
              className={`
                relative px-1.5 py-2.5 text-xs font-bold transition-all flex flex-col items-center gap-0.5 border-b border-r border-slate-50 dark:border-slate-800/50
                ${!sameMonth ? 'text-slate-300 dark:text-slate-700' : 'text-slate-700 dark:text-slate-300'}
                ${today ? 'bg-brand-50/50 dark:bg-brand-500/5' : ''}
                ${selected ? 'bg-brand-500/10 dark:bg-brand-500/20 ring-2 ring-brand-500/30 z-10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
              `}
            >
              <span
                className={`
                  w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-black
                  ${today ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30' : ''}
                  ${selected && !today ? 'bg-brand-500/20 text-brand-700 dark:text-brand-400' : ''}
                `}
              >
                {format(day, 'd')}
              </span>
              {hasAppointment && (
                <span className="w-1 h-1 rounded-full bg-brand-500 dark:bg-brand-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCalendar;
