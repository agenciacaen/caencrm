import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, MessageSquare, Bot, Kanban, Calendar, Search, Users, Building2,
  Phone, Settings, LogOut, Zap, Upload, Sun, Moon, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMenuToggle } from '../contexts/MenuContext';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} />, path: '/dashboard' },
  { id: 'conversas', label: 'Conversas', icon: <MessageSquare size={18} />, path: '/conversas' },
  { id: 'agente', label: 'Agente de IA', icon: <Bot size={18} />, path: '/agente' },
  { id: 'negocios', label: 'Negócios', icon: <Kanban size={18} />, path: '/deals' },
  { id: 'importador', label: 'Importador', icon: <Upload size={18} />, path: '/importador' },
  { id: 'agendamentos', label: 'Agendamentos', icon: <Calendar size={18} />, path: '/agendamentos' },
  { id: 'prospectar', label: 'Prospectar', icon: <Search size={18} />, path: '/prospectar' },
  { id: 'contatos', label: 'Contatos', icon: <Users size={18} />, path: '/contatos' },
  { id: 'empresas', label: 'Empresas', icon: <Building2 size={18} />, path: '/empresas' },
  { id: 'conexao', label: 'Conexão', icon: <Phone size={18} />, path: '/conexao' },
  { id: 'configuracoes', label: 'Configurações', icon: <Settings size={18} />, path: '/configuracoes' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, selectedAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { closeSidebar } = useMenuToggle();
  const [isExpanded, setIsExpanded] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activeTab = (() => {
    const segments = location.pathname.split('/');
    const first = segments[1] || 'dashboard';
    // Map sub-routes to their parent nav item
    if (first === 'deals') return 'negocios';
    if (first === 'contatos') return 'contatos';
    if (first === 'empresas') return 'empresas';
    if (first === 'reports') return 'dashboard';
    return first;
  })();

  const handleNavigation = (path: string) => {
    navigate(path);
    closeSidebar();
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMouseEnter = () => {
    if (!isDesktop) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isDesktop) return;
    hoverTimerRef.current = window.setTimeout(() => setIsExpanded(false), 250);
  };

  // Mobile: sempre expandido, Desktop: expandido no hover
  const effectiveExpanded = !isDesktop || isExpanded;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        bg-slate-900 flex flex-col h-full shrink-0 border-r border-slate-800
        transition-all duration-300 ease-out
        ${effectiveExpanded ? 'w-56' : 'w-16'}
      `}
    >
      {/* Header */}
      <div className="h-14 flex items-center shrink-0 px-3 border-b border-slate-800">
        <div className="flex items-center w-full">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-500 shadow-lg shadow-brand-500/20 shrink-0">
            <Zap className="text-slate-950 fill-slate-950" size={18} />
          </div>
          <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out origin-left ${effectiveExpanded ? 'max-w-[120px] ml-2.5 opacity-100 scale-x-100' : 'max-w-0 opacity-0 scale-x-0'}`}>
            <span className="font-extrabold text-white text-sm tracking-tight whitespace-nowrap">CaenCRM</span>
          </div>
          <button onClick={closeSidebar} className="lg:hidden ml-auto p-1.5 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Navigation — stagger delay cascade */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item, i) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            title={!effectiveExpanded ? item.label : undefined}
            style={{ '--i': i } as React.CSSProperties}
            className={`
              w-full flex items-center gap-0 py-2.5 text-xs font-semibold
              transition-all duration-300 ease-out
              ${effectiveExpanded ? '' : 'hover:scale-110'}
              ${activeTab === item.id
                ? 'text-brand-500 border-r-2 border-brand-500 bg-brand-500/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}
            `}
          >
            <div className={`flex items-center justify-center transition-all duration-300 ease-out ${effectiveExpanded ? 'w-12' : 'w-full'}`}>
              <span className={`shrink-0 transition-transform duration-300 ease-out ${activeTab === item.id ? 'text-brand-500' : 'text-slate-500'} ${effectiveExpanded ? '' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
            </div>
            <span
              style={{ transitionDelay: effectiveExpanded ? `${i * 25}ms` : '0ms' }}
              className={`
                overflow-hidden whitespace-nowrap transition-all duration-300 ease-out origin-left
                ${effectiveExpanded ? 'max-w-[140px] ml-3 opacity-100 scale-x-100' : 'max-w-0 opacity-0 scale-x-0'}
              `}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div
        style={{ transitionDelay: effectiveExpanded ? `${navItems.length * 25}ms` : '0ms' }}
        className={`border-t border-slate-800 shrink-0 overflow-hidden transition-all duration-300 ease-out ${effectiveExpanded ? 'max-h-48 opacity-100' : 'max-h-0 border-transparent opacity-0'}`}
      >
        <div className="p-3 space-y-3">
          <button
            onClick={toggleTheme}
            style={{ transitionDelay: effectiveExpanded ? `${(navItems.length + 1) * 25}ms` : '0ms' }}
            className={`flex items-center gap-0 w-full py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-300 ease-out ${effectiveExpanded ? 'px-2' : 'justify-center'}`}
          >
            <span className={`shrink-0 transition-transform duration-300 ${effectiveExpanded ? '' : 'scale-110'}`}>
              {theme === 'dark' ? <Sun size={16} className="text-brand-500" /> : <Moon size={16} className="text-blue-400" />}
            </span>
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out origin-left ${effectiveExpanded ? 'max-w-[120px] ml-3 opacity-100 scale-x-100' : 'max-w-0 opacity-0 scale-x-0'}`}>
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </span>
          </button>

          <div
            style={{ transitionDelay: effectiveExpanded ? `${(navItems.length + 2) * 25}ms` : '0ms' }}
            className={`flex items-center gap-0 py-1.5 rounded-xl hover:bg-slate-800 transition-all duration-300 ease-out cursor-pointer group ${effectiveExpanded ? 'px-2' : 'justify-center'}`}
          >
            <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 group-hover:ring-2 group-hover:ring-brand-500/50 transition-all">
              {(user?.available_name || user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out origin-left ${effectiveExpanded ? 'max-w-[140px] ml-2.5 opacity-100 scale-x-100' : 'max-w-0 opacity-0 scale-x-0'}`}>
              <p className="text-[10px] font-bold text-white truncate">{user?.available_name || user?.name || 'Usuário'}</p>
              <p className="text-[8px] text-slate-500 truncate">{selectedAccount?.name || user?.email || ''}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{ transitionDelay: effectiveExpanded ? `${(navItems.length + 3) * 25}ms` : '0ms' }}
            className={`flex items-center gap-0 w-full py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 ease-out ${effectiveExpanded ? 'px-2' : 'justify-center'}`}
            title="Sair"
          >
            <LogOut size={16} className="shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out origin-left ${effectiveExpanded ? 'max-w-[120px] ml-3 opacity-100 scale-x-100' : 'max-w-0 opacity-0 scale-x-0'}`}>
              Sair
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};


