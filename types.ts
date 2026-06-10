
// Add React import to fix "Cannot find namespace 'React'" error when using React.ReactNode
import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export interface KPI {
  label: string;
  value: string;
  status?: 'Online' | 'Inativo' | 'Ativo';
  subtext?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

export interface SalesMetric {
  label: string;
  value: string;
  subtext: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface Seller {
  rank: number;
  name: string;
  deals: number;
  won: number;
  value: string;
  rankColor?: string;
}

export interface Stage {
  label: string;
  count: number;
  percentage: number;
  color: string;
  width: string;
}

export type AppointmentStatus = 'Confirmado' | 'Pendente' | 'Cancelado' | 'Concluído';

export interface Appointment {
  id: string;
  name: string;
  service: string;
  date: string;   // ISO date string (YYYY-MM-DD)
  time: string;   // HH:mm
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentFormData = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>;
