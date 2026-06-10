import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useMenuToggle } from '../contexts/MenuContext';
import { syncAll } from '../api/sync';

export default function AppLayout() {
  const { user, selectedAccount } = useAuth();
  const location = useLocation();
  const { isSidebarOpen, closeSidebar } = useMenuToggle();

  useEffect(() => {
    syncAll().catch(() => {});
    const interval = setInterval(() => { syncAll().catch(() => {}); }, 300000);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!selectedAccount) {
    return <Navigate to="/select-account" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-slate-950">
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        />
      )}

      <div className={`
        fixed lg:static z-50 h-full transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950 h-full">
        <Outlet />
      </div>
    </div>
  );
}
