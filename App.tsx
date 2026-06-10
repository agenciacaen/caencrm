import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppLayout from './components/AppLayout';
import Login from './components/Login';
import AccountSelector from './components/AccountSelector';
import NotFound from './components/NotFound';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Conversations = lazy(() => import('./components/Conversations'));
const AIAgent = lazy(() => import('./components/AIAgent'));
const CRMBoard = lazy(() => import('./components/CRMBoard'));
const BulkImport = lazy(() => import('./components/BulkImport'));
const Appointments = lazy(() => import('./components/Appointments'));
const Prospecting = lazy(() => import('./components/Prospecting'));
const Contacts = lazy(() => import('./components/Contacts'));
const Companies = lazy(() => import('./components/Companies'));
const Connection = lazy(() => import('./components/Connection'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const ContactDetail = lazy(() => import('./components/contacts/ContactDetail'));
const CompanyDetail = lazy(() => import('./components/companies/CompanyDetail'));
const DealsList = lazy(() => import('./components/deals/DealsList'));
const DealsKanban = lazy(() => import('./components/deals/DealsKanban'));
const DealDetail = lazy(() => import('./components/deals/DealDetail'));
const Reports = lazy(() => import('./components/reports/Reports'));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="animate-spin text-brand-500" size={32} />
    </div>
  );
}

function Page({ Comp }: { Comp: React.ComponentType<any> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Comp />
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/select-account" element={<AccountSelector />} />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Page Comp={Dashboard} />} />
        <Route path="/conversas" element={<Page Comp={Conversations} />} />
        <Route path="/agente" element={<Page Comp={AIAgent} />} />
        <Route path="/crm" element={<Navigate to="/deals/board" replace />} />
        <Route path="/deals" element={<Page Comp={DealsList} />} />
        <Route path="/deals/board" element={<Page Comp={DealsKanban} />} />
        <Route path="/deals/:id" element={<Page Comp={DealDetail} />} />
        <Route path="/importador" element={<Page Comp={BulkImport} />} />
        <Route path="/agendamentos" element={<Page Comp={Appointments} />} />
        <Route path="/prospectar" element={<Page Comp={Prospecting} />} />
        <Route path="/contatos" element={<Page Comp={Contacts} />} />
        <Route path="/contatos/:id" element={<Page Comp={ContactDetail} />} />
        <Route path="/empresas" element={<Page Comp={Companies} />} />
        <Route path="/empresas/:id" element={<Page Comp={CompanyDetail} />} />
        <Route path="/conexao" element={<Page Comp={Connection} />} />
        <Route path="/configuracoes" element={<Page Comp={SettingsView} />} />
        <Route path="/reports" element={<Page Comp={Reports} />} />
      </Route>
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
