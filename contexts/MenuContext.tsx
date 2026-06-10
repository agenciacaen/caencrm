import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface MenuContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

const MenuContext = createContext<MenuContextType | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);

  return (
    <MenuContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar, openSidebar }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenuToggle() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenuToggle must be used within MenuProvider');
  return ctx;
}
