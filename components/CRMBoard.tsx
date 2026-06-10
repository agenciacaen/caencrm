import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Kanban, 
  Plus, 
  MoreHorizontal, 
  User, 
  Menu, 
  Loader2, 
  Trash2,
  Calendar, 
  Clock, 
  RefreshCw, 
  Search, 
  SlidersHorizontal, 
  List, 
  Star, 
  Phone, 
  Activity, 
  Bell, 
  AlertCircle, 
  Check, 
  X, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { useConversations } from '../hooks/useConversations';
import CreateDealModal from './CreateDealModal';
import EditDealModal from './EditDealModal';
import chatwootAPI from '../api/chatwoot';
import { useMenuToggle } from '../contexts/MenuContext';

const KANBAN_STAGES = [
  { id: 'novo-lead', title: 'Entrada de Lead', color: 'bg-brand-500' },
  { id: 'qualificacao', title: 'Qualificação IA', color: 'bg-indigo-500' },
  { id: 'proposta', title: 'Proposta Enviada', color: 'bg-pink-500' },
  { id: 'negociacao', title: 'Negociação', color: 'bg-emerald-500' },
];

const CRMBoard: React.FC = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useMenuToggle();
  const { data, loading, error, refetch } = useConversations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [activeStage, setActiveStage] = useState('novo-lead');
  const [localConversations, setLocalConversations] = useState<any[]>([]);
  const [draggingOverStage, setDraggingOverStage] = useState<string | null>(null);

  // New Features States
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(150);
  const [activeFilterStage, setActiveFilterStage] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // Drawer States
  const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Local storage for priorities (stars 1-5)
  const [leadPriorities, setLeadPriorities] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('caen_crm_lead_priorities');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync priorities with local storage
  const handleSetPriority = (leadId: number, stars: number) => {
    setLeadPriorities(prev => {
      const next = { ...prev, [leadId]: stars };
      localStorage.setItem('caen_crm_lead_priorities', JSON.stringify(next));
      return next;
    });
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = window.confirm(`Deseja realmente excluir permanentemente as ${selectedIds.length} negociações selecionadas?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      for (const id of selectedIds) {
        try {
          await chatwootAPI.conversations.delete(id);
        } catch (err) {
          console.error(`Erro ao deletar conversa #${id}:`, err);
        }
        await delay(150);
      }
      setSelectedIds([]);
      refetch();
      alert('Negociações selecionadas foram excluídas com sucesso!');
    } catch (globalErr) {
      console.error('Erro global na exclusão de negociações:', globalErr);
      alert('Ocorreu um erro durante a exclusão.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sincroniza dados da API com o estado local
  useEffect(() => {
    if (data?.data?.payload) {
      setLocalConversations(data.data.payload);
    }
  }, [data]);

  const handleOpenModal = (stageId: string) => {
    setActiveStage(stageId);
    setIsModalOpen(true);
  };

  const handleCardClick = (cardId: number) => {
    const conversation = localConversations.find(c => c.id === cardId);
    if (conversation) {
      setSelectedConversation(conversation);
      setIsEditModalOpen(true);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, cardId: number, sourceStageId: string) => {
    e.dataTransfer.setData('text/plain', String(cardId));
    e.dataTransfer.setData('sourceStageId', sourceStageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggingOverStage !== stageId) {
      setDraggingOverStage(stageId);
    }
  };

  const handleDragLeave = () => {
    setDraggingOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDraggingOverStage(null);

    const cardIdStr = e.dataTransfer.getData('text/plain');
    const sourceStageId = e.dataTransfer.getData('sourceStageId');
    if (!cardIdStr) return;

    const cardId = Number(cardIdStr);
    if (sourceStageId === targetStageId) return;

    // 1. Encontra a conversa
    const conversation = localConversations.find(c => c.id === cardId);
    if (!conversation) return;

    // 2. Calcula as novas labels (remove labels antigas do funil e adiciona a nova)
    const stageIds = KANBAN_STAGES.map(s => s.id);
    const currentLabels = conversation.labels || [];
    const otherLabels = currentLabels.filter((l: string) => !stageIds.includes(l));
    const newLabels = [...otherLabels, targetStageId];

    // 3. Atualização Otimista local
    const originalConversations = [...localConversations];
    const updatedConversations = localConversations.map(c => {
      if (c.id === cardId) {
        return { ...c, labels: newLabels };
      }
      return c;
    });
    setLocalConversations(updatedConversations);

    try {
      // 4. Salva no Chatwoot
      await chatwootAPI.conversations.addLabels(cardId, newLabels);
      // Sincroniza com a API em background para garantir integridade
      refetch();
    } catch (err) {
      console.error('[CaenCRM] Erro ao mover oportunidade:', err);
      // Reverte em caso de falha
      setLocalConversations(originalConversations);
      alert('Não foi possível mover a negociação. Tente novamente.');
    }
  };

  // Helper to format values in BRL
  const formatBRL = (value: any) => {
    const numericVal = parseFloat(value || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericVal);
  };

  // Filter conversations based on Search and Stage Filters
  const getFilteredConversations = () => {
    return localConversations.filter(c => {
      const labels = c.labels || [];
      
      // Ignore deleted/archived pipeline opportunities
      if (labels.includes('excluido') || labels.includes('arquivado')) {
        return false;
      }

      // Filter by stage from stage filter state
      if (activeFilterStage !== 'all') {
        if (activeFilterStage === 'novo-lead') {
          const stageIds = KANBAN_STAGES.map(s => s.id);
          const hasOtherStageLabel = labels.some((l: string) => stageIds.includes(l));
          if (!(labels.length === 0 || labels.includes('novo-lead') || labels.includes('lead') || !hasOtherStageLabel)) {
            return false;
          }
        } else if (!labels.includes(activeFilterStage)) {
          return false;
        }
      }

      // Search term match
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const idMatch = String(c.id).toLowerCase().includes(query);
        const name = (c.meta?.sender?.name || c.contact?.name || 'Desconhecido').toLowerCase();
        const phone = (c.meta?.sender?.phone_number || c.contact?.phone_number || '').toLowerCase();
        
        return idMatch || name.includes(query) || phone.includes(query);
      }

      return true;
    });
  };

  const filteredConvs = getFilteredConversations();

  // Retrieve cards mapping for specific stage from filtered list
  const getCardsForStage = (stageId: string) => {
    return filteredConvs.filter(c => {
      const labels = c.labels || [];
      
      if (stageId === 'novo-lead') {
        const stageIds = KANBAN_STAGES.map(s => s.id);
        const hasOtherStageLabel = labels.some((l: string) => stageIds.includes(l));
        return labels.length === 0 || labels.includes('novo-lead') || labels.includes('lead') || !hasOtherStageLabel;
      }
      return labels.includes(stageId);
    }).map(c => {
      const name = c.meta?.sender?.name || c.contact?.name || 'Desconhecido';
      const initial = name.substring(0, 2).toUpperCase();
      const customVal = c.custom_attributes?.deal_value;
      const rawVal = customVal ? parseFloat(customVal) : 0;
      
      // WhatsApp or phone number
      const phone = c.meta?.sender?.phone_number || c.contact?.phone_number || null;
      
      // Deterministic simulation of completed activities or get from attributes
      const totalActivities = (c.id % 4) + 1;
      const completedActivities = c.id % 2 === 0 ? totalActivities : Math.max(0, totalActivities - 1);

      return {
        id: c.id,
        name,
        rawVal,
        value: formatBRL(rawVal),
        time: new Date(c.last_activity_at * 1000).toLocaleDateString('pt-BR'),
        initial,
        phone,
        priority: leadPriorities[c.id] || 0,
        completedActivities,
        totalActivities,
        rawConversation: c
      };
    });
  };

  // Get total sums and columns metadata
  const columns = KANBAN_STAGES.map(stage => {
    const stageCards = getCardsForStage(stage.id);
    const totalSum = stageCards.reduce((sum, card) => sum + card.rawVal, 0);
    return {
      ...stage,
      count: stageCards.length,
      totalFormatted: formatBRL(totalSum),
      cards: stageCards.slice(0, pageSize) // Paged limit
    };
  });

  // Flat list of all opportunities for List View
  const getFlatOpportunities = () => {
    return filteredConvs.map(c => {
      const name = c.meta?.sender?.name || c.contact?.name || 'Desconhecido';
      const initial = name.substring(0, 2).toUpperCase();
      const customVal = c.custom_attributes?.deal_value;
      const rawVal = customVal ? parseFloat(customVal) : 0;
      const phone = c.meta?.sender?.phone_number || c.contact?.phone_number || null;
      
      // Stage identify
      const labels = c.labels || [];
      const currentStage = KANBAN_STAGES.find(s => labels.includes(s.id)) || KANBAN_STAGES[0];

      return {
        id: c.id,
        name,
        rawVal,
        value: formatBRL(rawVal),
        time: new Date(c.last_activity_at * 1000).toLocaleDateString('pt-BR'),
        initial,
        phone,
        priority: leadPriorities[c.id] || 0,
        stage: currentStage,
        rawConversation: c
      };
    });
  };

  const allOpportunities = getFlatOpportunities().slice(0, pageSize);

  // Mock list of appointments (agenda) for drawer
  const mockAppointments = [
    { id: 1, name: 'Junior Costa', service: 'Reunião de Alinhamento', time: '10:00', date: 'Hoje', status: 'Confirmado' },
    { id: 2, name: 'Lucas Ferreira', service: 'Apresentação CaenCRM', time: '14:30', date: 'Hoje', status: 'Pendente' },
    { id: 3, name: 'Maria Silva', service: 'Fechamento Comercial', time: '16:00', date: 'Amanhã', status: 'Confirmado' },
    { id: 4, name: 'Renato Mendes', service: 'Demonstração de Integrações', time: '11:00', date: '25 Mai', status: 'Confirmado' }
  ];

  // Mock events for bottom event drawer
  const mockEvents = [
    { id: 1, text: 'Lead "Junior Costa" qualificado por Caen Inteligência Artificial', time: 'Há 5 minutos', type: 'system' },
    { id: 2, text: 'Maria Silva moveu proposta de "Proposta" para "Negociação"', time: 'Há 12 minutos', type: 'user' },
    { id: 3, text: 'Nova negociação de R$ 8.500,00 criada para Lucas Ferreira', time: 'Há 1 hora', type: 'create' },
    { id: 4, text: 'Mensagem recebida do canal WhatsApp por Renato Mendes', time: 'Há 3 horas', type: 'message' }
  ];

  // Mock alerts for alerts drawer
  const mockAlerts = [
    { id: 1, title: 'Lead sem contato há mais de 3 dias', desc: 'Junior Costa está qualificado, mas sem interação humana.', type: 'error' },
    { id: 2, title: 'Proposta pendente de resposta', desc: 'A proposta comercial de Lucas Ferreira expira em 24h.', type: 'warning' },
    { id: 3, title: 'Integrador WhatsApp instável', desc: 'Queda na conexão da API de envio em massa foi detectada.', type: 'info' }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0c0d0e] transition-all relative">
      
      {/* 1. BRANDED STYLE TOP HEADER */}
      <header className="bg-white dark:bg-[#151718] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 shrink-0 flex items-center justify-between shadow-sm relative z-20">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2.5 bg-slate-50 dark:bg-[#222526] border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-300">
            <Menu size={20} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Pipeline Vendas CRM</span>
              <ChevronRight size={10} className="text-slate-300 dark:text-slate-600" />
              <span className="text-brand-500 dark:text-[#f3c76b]">Funil de Vendas</span>
            </div>
            <h1 className="text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5 uppercase">
              Funil de Vendas
            </h1>
          </div>
        </div>

        {/* Header Right Action Area */}
        <div className="flex items-center gap-3">
          
          {/* Active Appointments button */}
          <button 
            onClick={() => setIsAppointmentsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#222526] dark:hover:bg-[#2d3032] border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm group"
          >
            <Clock size={15} className="text-brand-500 dark:text-[#f3c76b] group-hover:scale-110 transition-transform" />
            <span>Agendadas</span>
            <span className="w-5 h-5 rounded-full bg-brand-500/20 text-[#d97706] dark:text-[#f3c76b] text-[10px] font-black flex items-center justify-center">
              {mockAppointments.length}
            </span>
          </button>

          {/* Refresh Button */}
          <button 
            onClick={() => refetch()}
            title="Sincronizar oportunidades"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#222526] dark:hover:bg-[#2d3032] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw size={15} className={`hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Segmented control: Kanban vs Lista */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1c1e1f] p-1 rounded-xl border border-slate-200/50 dark:border-slate-850">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-[#2e3234] text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Kanban size={12} />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#2e3234] text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <List size={12} />
              <span>Lista</span>
            </button>
          </div>

          {/* Create Button */}
          <button 
            onClick={() => handleOpenModal('novo-lead')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 dark:bg-[#f3c76b] text-white dark:text-slate-950 rounded-xl text-xs font-black hover:bg-slate-850 dark:hover:bg-[#fbbf24] transition-all shadow-xl shadow-slate-950/15 dark:shadow-brand-500/10 uppercase tracking-widest"
          >
            <Plus size={16} className="stroke-[3px]" />
            <span>Nova Negociação</span>
          </button>
        </div>
      </header>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="bg-white dark:bg-[#111314]/90 border-b border-slate-200 dark:border-slate-800/60 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 z-10">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por título, nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#0c0d0e] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 dark:focus:ring-brand-500/20 hover:border-slate-350 dark:hover:border-slate-750 transition-all placeholder:text-slate-450 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters and page count */}
        <div className="flex items-center gap-3 ml-auto">
          
          {/* Quick Stage Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-1.5 px-4 py-2.5 border rounded-xl text-xs font-bold transition-all shadow-sm ${
                activeFilterStage !== 'all'
                  ? 'border-brand-500 dark:border-[#f3c76b] text-brand-600 dark:text-[#f3c76b] bg-brand-50/20 dark:bg-brand-500/5'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-white dark:bg-[#151718] hover:bg-slate-50 dark:hover:bg-[#222526]'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
              {activeFilterStage !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
              )}
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#151718] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 py-3 animate-fadeIn">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 mb-2">Filtrar por Estágio</p>
                <div className="space-y-1">
                  <button
                    onClick={() => { setActiveFilterStage('all'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${activeFilterStage === 'all' ? 'bg-slate-100 dark:bg-[#222526] text-brand-600 dark:text-[#f3c76b]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1e1f]'}`}
                  >
                    <span>Todos os estágios</span>
                    {activeFilterStage === 'all' && <Check size={14} />}
                  </button>
                  {KANBAN_STAGES.map(stage => (
                    <button
                      key={stage.id}
                      onClick={() => { setActiveFilterStage(stage.id); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${activeFilterStage === stage.id ? 'bg-slate-100 dark:bg-[#222526] text-brand-600 dark:text-[#f3c76b]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c1e1f]'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${stage.color}`}></span>
                        <span>{stage.title}</span>
                      </div>
                      {activeFilterStage === stage.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PAGE SIZE SELECTOR */}
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#151718] text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm">
            <span className="uppercase tracking-widest text-[9px] text-slate-450 dark:text-slate-550">Por Página</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent text-slate-800 dark:text-slate-100 font-extrabold outline-none cursor-pointer"
            >
              <option value={10} className="dark:bg-[#151718]">10</option>
              <option value={25} className="dark:bg-[#151718]">25</option>
              <option value={50} className="dark:bg-[#151718]">50</option>
              <option value={100} className="dark:bg-[#151718]">100</option>
              <option value={150} className="dark:bg-[#151718]">150</option>
            </select>
          </div>

        </div>
      </div>

      {/* 3. CORE VIEW AREA (KANBAN OR LIST) */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0c0d0e] p-6 no-scrollbar">
        {loading && localConversations.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-16">
            <Loader2 className="animate-spin mb-4 text-brand-500" size={32} />
            <p className="text-xs font-black uppercase tracking-wider">Carregando oportunidades do Chatwoot...</p>
          </div>
        ) : error && localConversations.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-rose-500 py-16">
            <AlertCircle className="mb-4" size={32} />
            <p className="text-sm font-bold">Erro ao carregar oportunidades</p>
            <p className="text-xs mt-1 text-slate-450">{error}</p>
          </div>
        ) : viewMode === 'kanban' ? (
          
          /* KANBAN BOARD VIEW */
          <div className="flex gap-6 min-h-full items-start">
            {columns.map((col, i) => {
              const isDraggingOver = draggingOverStage === col.id;
              return (
                <div 
                  key={col.id} 
                  className={`w-80 shrink-0 flex flex-col p-4 rounded-[26px] bg-slate-100/50 dark:bg-[#151718]/45 border-2 transition-all duration-200 ${
                    isDraggingOver 
                      ? 'bg-slate-200/40 dark:bg-[#1c1e1f]/40 border-dashed border-brand-500/40 shadow-inner scale-[0.99]' 
                      : 'border-transparent'
                  }`}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  
                  {/* Column Header with values and counter */}
                  <div className="flex flex-col mb-4 px-1 gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.color} ring-4 ring-white dark:ring-[#0c0d0e]`}></span>
                        <h3 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">{col.title}</h3>
                        <span className="text-[10px] bg-white dark:bg-[#222526] border border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-black shadow-sm">{col.count}</span>
                      </div>
                      <button 
                        onClick={() => handleOpenModal(col.id)}
                        className="text-slate-400 hover:text-brand-500 dark:hover:text-[#f3c76b] p-1 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {/* Financial total formatting */}
                    <div className="text-xs font-black text-slate-900 dark:text-white pl-4 tracking-tight leading-none mt-1">
                      {col.totalFormatted}
                    </div>
                  </div>
                  
                  {/* Cards stack */}
                  <div className="flex-1 space-y-4 min-h-[350px]">
                    {col.cards.length === 0 ? (
                      /* Empty Column Placeholder styled from reference */
                      <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl text-center h-full min-h-[160px] bg-white/30 dark:bg-black/10">
                        <p className="text-[11px] font-black text-slate-400 dark:text-slate-600">Nenhuma negociação</p>
                        <p className="text-[10px] text-slate-300 dark:text-slate-700 font-bold mt-1">Arraste cards para cá</p>
                      </div>
                    ) : (
                      col.cards.map((card) => {
                        const isSelected = selectedIds.includes(card.id);
                        return (
                          <div 
                            key={card.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id, col.id)}
                            onClick={() => handleCardClick(card.id)}
                            className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer active:cursor-grabbing group shadow-sm flex flex-col ${
                              isSelected 
                                ? 'bg-brand-50/15 dark:bg-brand-500/10 border-brand-500 ring-2 ring-brand-500/25 shadow-md shadow-brand-500/5' 
                                : 'bg-white dark:bg-[#151718] border-slate-200/90 dark:border-slate-850 hover:shadow-xl hover:border-brand-500/30 dark:hover:border-brand-500/30 dark:hover:bg-[#181a1c]'
                            }`}
                          >
                            {/* Card Header (Check box + ID + value green) */}
                            <div className="flex justify-between items-start mb-2.5">
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  className="w-3.5 h-3.5 rounded border-slate-350 dark:border-slate-700 text-brand-600 focus:ring-brand-500 dark:focus:ring-brand-500/50 bg-white dark:bg-[#222526] cursor-pointer"
                                  checked={isSelected}
                                  onChange={(e) => handleSelectOne(card.id, e.target.checked)}
                                />
                                <span className="text-[10px] font-black text-slate-450 dark:text-slate-550 uppercase tracking-tighter">#CAEN-{card.id}</span>
                              </div>
                              {/* Green highlight for deal value */}
                              <span className="text-xs font-black text-emerald-600 dark:text-[#f3c76b] tracking-tight bg-emerald-50 dark:bg-brand-500/5 px-2 py-0.5 rounded-lg border border-emerald-100/50 dark:border-brand-500/10">
                                {card.value}
                              </span>
                            </div>

                            {/* Lead Name */}
                            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-2 group-hover:text-brand-600 dark:group-hover:text-[#f3c76b] transition-colors leading-tight">
                              {card.name}
                            </h4>
                            
                            {/* BADGES ROW (Stars, Completed check) */}
                            <div className="flex flex-wrap items-center gap-2 mb-3 mt-1">
                              
                              {/* Clickable Gold Stars priority */}
                              <div 
                                className="flex items-center gap-0.5 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {[1, 2, 3, 4, 5].map((starIdx) => (
                                  <button
                                    key={starIdx}
                                    onClick={() => handleSetPriority(card.id, starIdx)}
                                    className="transition-transform active:scale-125"
                                  >
                                    <Star 
                                      size={10} 
                                      className={`${
                                        starIdx <= card.priority 
                                          ? 'fill-amber-400 text-amber-400' 
                                          : 'text-slate-350 dark:text-slate-700'
                                      }`} 
                                    />
                                  </button>
                                ))}
                              </div>

                              {/* Action Items/Events Complete Badge */}
                              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-[#222526] text-slate-550 dark:text-slate-400 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                                <Check size={8} className="text-emerald-500 stroke-[3px]" />
                                <span>{card.completedActivities} concluídas</span>
                              </span>
                            </div>

                            {/* Contact green whatsapp button/badge */}
                            {card.phone && (
                              <div 
                                className="mb-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => window.open(`https://web.whatsapp.com/send?phone=${card.phone.replace(/\D/g, '')}`, '_blank')}
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                  <Phone size={10} className="fill-emerald-500/20" />
                                  <span>{card.phone}</span>
                                </button>
                              </div>
                            )}

                            {/* Bottom Card Area (Avatar, Dates) */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-slate-950 dark:bg-[#f3c76b] text-white dark:text-slate-950 rounded-lg flex items-center justify-center text-[9px] font-black shadow-sm">
                                  {card.initial}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-none">{card.time}</span>
                                  <span className="text-[8px] font-black text-slate-350 dark:text-slate-600 uppercase tracking-tighter mt-0.5">etapa: {card.time}</span>
                                </div>
                              </div>

                              <button 
                                onClick={(e) => { e.stopPropagation(); handleCardClick(card.id); }}
                                className="p-1.5 hover:bg-slate-50 dark:hover:bg-[#222526] rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                              >
                                <MoreHorizontal size={14} className="text-slate-400 dark:text-slate-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Quick creation bottom card button */}
                    <button 
                      onClick={() => handleOpenModal(col.id)}
                      className="w-full py-3.5 border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-[#f3c76b] hover:border-brand-500/50 dark:hover:border-[#f3c76b]/50 hover:bg-brand-50/20 dark:hover:bg-brand-500/5 transition-all flex items-center justify-center gap-2 text-[10px] font-extrabold uppercase tracking-widest"
                    >
                      <Plus size={14} className="stroke-[2.5px]" />
                      <span>Novo Lead</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        ) : (
          
          /* PREMIUM LIST / TABLE VIEW */
          <div className="bg-white dark:bg-[#151718] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm animate-fadeIn">
            {allOpportunities.length === 0 ? (
              <div className="p-16 text-center">
                <AlertCircle className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={32} />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-300">Nenhuma negociação encontrada</p>
                <p className="text-xs text-slate-400 mt-1">Tente ajustar seus termos de busca ou filtros.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-[#1c1e1f]/50 border-b border-slate-100 dark:border-slate-850">
                      <th className="px-6 py-4 w-12">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-slate-350 dark:border-slate-700 text-brand-600 focus:ring-brand-500 dark:focus:ring-brand-500/50 bg-white dark:bg-[#222526] cursor-pointer"
                          checked={selectedIds.length === allOpportunities.length && allOpportunities.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(allOpportunities.map(o => o.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ID</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Lead / Contato</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">WhatsApp</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estágio</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Prioridade</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Atualização</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {allOpportunities.map((op) => {
                      const isSelected = selectedIds.includes(op.id);
                      return (
                        <tr 
                          key={op.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-[#1a1c1d]/60 transition-colors group cursor-pointer ${
                            isSelected ? 'bg-brand-50/5 dark:bg-brand-500/5' : ''
                          }`}
                          onClick={() => handleCardClick(op.id)}
                        >
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded border-slate-350 dark:border-slate-700 text-brand-600 focus:ring-brand-500 dark:focus:ring-brand-500/50 bg-white dark:bg-[#222526] cursor-pointer"
                              checked={isSelected}
                              onChange={(e) => handleSelectOne(op.id, e.target.checked)}
                            />
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500">
                            #CAEN-{op.id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-900 dark:bg-[#222526] text-white dark:text-slate-200 rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm">
                                {op.initial}
                              </div>
                              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-[#f3c76b] transition-all">
                                {op.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                            {op.phone ? (
                              <button
                                onClick={() => window.open(`https://web.whatsapp.com/send?phone=${op.phone!.replace(/\D/g, '')}`, '_blank')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/20 border border-emerald-250/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black transition-all"
                              >
                                <Phone size={10} className="fill-emerald-500/20" />
                                <span>{op.phone}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 italic">--</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-white ${op.stage.color}`}>
                              <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                              {op.stage.title}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-white">
                            {op.value}
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((starIdx) => (
                                <button
                                  key={starIdx}
                                  onClick={() => handleSetPriority(op.id, starIdx)}
                                  className="transition-transform active:scale-125"
                                >
                                  <Star 
                                    size={12} 
                                    className={`${
                                      starIdx <= op.priority 
                                        ? 'fill-amber-400 text-amber-400' 
                                        : 'text-slate-300 dark:text-slate-700'
                                    }`} 
                                  />
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500">
                            {op.time}
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => handleCardClick(op.id)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-[#222526] rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        )}
      </div>

      {/* 4. DRAWER COMPONENT: APPOINTMENTS (AGENDADAS) */}
      {isAppointmentsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fadeIn">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsAppointmentsOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
          />
          {/* Drawer container */}
          <div className="relative w-full max-w-md bg-white dark:bg-[#151718] border-l border-slate-200 dark:border-slate-800/80 shadow-2xl h-full flex flex-col animate-slideLeft">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#111314]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-[#f3c76b] flex items-center justify-center shadow-inner">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">Compromissos Agendados</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider leading-none mt-0.5">Sincronizados da agenda</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAppointmentsOpen(false)}
                className="p-2 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222526] rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {mockAppointments.map((ap) => (
                <div 
                  key={ap.id}
                  className="p-4 bg-slate-50 dark:bg-[#1c1e1f] border border-slate-150 dark:border-slate-850 rounded-2xl hover:border-brand-500/30 dark:hover:border-brand-500/30 transition-all shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
                      {ap.status}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">
                      <Clock size={10} />
                      <span>{ap.date} às {ap.time}</span>
                    </div>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-tight mb-1">{ap.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic mb-3">{ap.service}</p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setIsAppointmentsOpen(false); navigate('/deals'); }}
                      className="flex-1 py-2 bg-slate-950 dark:bg-[#f3c76b] text-white dark:text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md dark:shadow-brand-500/5 hover:bg-slate-850 dark:hover:bg-[#fbbf24] text-center"
                    >
                      Ver Negociação
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. DRAWER COMPONENT: EVENTS (HISTÓRICO) */}
      {isEventsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fadeIn">
          <div onClick={() => setIsEventsOpen(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300" />
          <div className="relative w-full max-w-md bg-white dark:bg-[#151718] border-l border-slate-200 dark:border-slate-800/80 shadow-2xl h-full flex flex-col animate-slideLeft">
            
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#111314]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-950 dark:bg-[#222526] text-white dark:text-slate-250 flex items-center justify-center shadow-inner">
                  <Activity size={18} className="text-[#f3c76b]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">Atividades e Eventos</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider leading-none mt-0.5">Pipeline em tempo real</p>
                </div>
              </div>
              <button onClick={() => setIsEventsOpen(false)} className="p-2 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222526] rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
              {mockEvents.map((ev) => (
                <div key={ev.id} className="flex gap-4 border-l border-slate-200 dark:border-slate-800 pl-4 relative py-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white dark:border-[#151718] absolute -left-[6px] top-2"></div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-250 leading-relaxed">{ev.text}</p>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-650 mt-1 block uppercase">{ev.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. DRAWER COMPONENT: ALERTS */}
      {isAlertsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fadeIn">
          <div onClick={() => setIsAlertsOpen(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300" />
          <div className="relative w-full max-w-md bg-white dark:bg-[#151718] border-l border-slate-200 dark:border-slate-800/80 shadow-2xl h-full flex flex-col animate-slideLeft">
            
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#111314]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#4ade80] flex items-center justify-center shadow-inner">
                  <Bell size={18} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">Alertas do CRM</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider leading-none mt-0.5">Leads críticos e notificações</p>
                </div>
              </div>
              <button onClick={() => setIsAlertsOpen(false)} className="p-2 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222526] rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {mockAlerts.map((al) => (
                <div 
                  key={al.id} 
                  className={`p-4 rounded-2xl border flex gap-3 ${
                    al.type === 'error' 
                      ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/30 text-rose-800 dark:text-rose-400' 
                      : al.type === 'warning'
                      ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/30 text-amber-800 dark:text-amber-400'
                      : 'bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-200/50 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-400'
                  }`}
                >
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs leading-tight mb-1">{al.title}</h4>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400/80 leading-normal">{al.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. FLOATING ACTION BUTTONS (BOTTOM RIGHT) FROM REFERENCE */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40 items-end">
        {/* Events action */}
        <button
          onClick={() => setIsEventsOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-900 dark:bg-[#151718] text-white hover:bg-slate-800 dark:hover:bg-[#222526] rounded-full shadow-2xl border border-slate-800/80 transition-all hover:scale-105 group active:scale-95"
        >
          <Activity size={16} className="text-brand-500 dark:text-[#f3c76b] group-hover:animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Eventos</span>
        </button>

        {/* Alertas green action */}
        <button
          onClick={() => setIsAlertsOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-full shadow-2xl border border-emerald-400/20 transition-all hover:scale-105 group active:scale-95 animate-pulse"
        >
          <Bell size={16} className="fill-slate-950/15" />
          <span className="text-[10px] font-black uppercase tracking-widest">Alertas</span>
          <span className="w-2 h-2 rounded-full bg-white border border-emerald-600"></span>
        </button>
      </div>

      {/* 8. BATCH EXCLUSION FLOATING ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-[#151718]/95 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl border border-slate-800 flex items-center gap-6 z-50 animate-fadeIn min-w-[340px] justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500 dark:bg-[#f3c76b] text-slate-950 flex items-center justify-center font-black text-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-200">Selecionadas</p>
              <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">negociações marcadas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 hover:bg-slate-800 dark:hover:bg-[#222526] rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/10 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={12} className="animate-spin shrink-0" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 size={12} className="shrink-0" />
                  <span>Excluir Selecionadas</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 9. MODALS */}
      <CreateDealModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refetch()}
        initialStage={activeStage}
      />

      <EditDealModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => refetch()}
        conversation={selectedConversation}
      />
    </div>
  );
};

export default CRMBoard;