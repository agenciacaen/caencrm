import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  CheckCircle2, 
  RefreshCw, 
  Smartphone, 
  QrCode, 
  AlertTriangle, 
  Menu, 
  Loader2, 
  Inbox, 
  Plus, 
  X, 
  Link2, 
  Check, 
  AlertCircle, 
  Trash2,
  MessageCircle,
  Mail,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useInboxes } from '../hooks/useAccount';
import { 
  createInstance, 
  setChatwootIntegration, 
  getQRCode, 
  getConnectionState, 
  deleteInstance 
} from '../api/evolution';
import chatwootAPI from '../api/chatwoot';
import { useMenuToggle } from '../contexts/MenuContext';

type ModalStep = 'idle' | 'orchestrating' | 'instance-exists' | 'qrcode' | 'success' | 'error';

const CHANNEL_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; badgeColor: string }> = {
  'Channel::Whatsapp': {
    icon: <Phone size={18} />,
    label: 'WhatsApp',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  'Channel::Api': {
    icon: <MessageCircle size={18} />,
    label: 'WhatsApp (Evolution)',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  'Channel::Email': {
    icon: <Mail size={18} />,
    label: 'Email',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40',
    badgeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  'Channel::Instagram': {
    icon: <MessageSquare size={18} />,
    label: 'Instagram',
    color: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/40',
    badgeColor: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  },
  'Channel::Twilio SMS': {
    icon: <MessageSquare size={18} />,
    label: 'SMS',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40',
    badgeColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
  'Channel::Telegram': {
    icon: <Send size={18} />,
    label: 'Telegram',
    color: 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40',
    badgeColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  },
};

function getChannelConfig(channelType: string) {
  return CHANNEL_CONFIG[channelType] || {
    icon: <Inbox size={18} />,
    label: channelType.replace('Channel::', ''),
    color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
    badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };
}

const Connection: React.FC = () => {
  const { toggleSidebar } = useMenuToggle();
  const { data, loading, error, refetch } = useInboxes();
  const inboxes = data?.payload || [];

  // Estados da Modal de Conexão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [instanceName, setInstanceName] = useState('');
  const [modalStep, setModalStep] = useState<ModalStep>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Rastreamento das sub-etapas de orquestração
  const [orchestrationStatus, setOrchestrationStatus] = useState({
    instance: 'pending', // 'pending' | 'loading' | 'success' | 'error'
    integration: 'pending',
    qrcode: 'pending'
  });

  // Estados do QR Code e Polling
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Estados para Exclusão de Conexão
  const [inboxToDelete, setInboxToDelete] = useState<any | null>(null);
  const [isDeletingInbox, setIsDeletingInbox] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');

  // Limpa o polling de conexão ao desmontar ou fechar modal
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleOpenDeleteConfirm = (inbox: any) => {
    setInboxToDelete(inbox);
    setDeleteErrorMessage('');
  };

  const handleCloseDeleteConfirm = () => {
    if (!isDeletingInbox) {
      setInboxToDelete(null);
    }
  };

  const handleExecuteDeleteInbox = async () => {
    if (!inboxToDelete) return;
    setIsDeletingInbox(true);
    setDeleteErrorMessage('');

    try {
      // 1. Excluir no Chatwoot
      await chatwootAPI.inboxes.delete(inboxToDelete.id);

      // 2. Excluir a instância na Evolution API (nome da inbox higienizado)
      try {
        await deleteInstance(inboxToDelete.name);
      } catch (err) {
        // Ignora erro se a instância não existir ou se a VPS der timeout
        console.warn("Falha ao deletar instância correspondente na Evolution API:", err);
      }

      // Limpeza e Sincronização
      setInboxToDelete(null);
      refetch();
    } catch (err: any) {
      console.error(err);
      setDeleteErrorMessage(err.message || 'Falha ao deletar o canal no Chatwoot.');
    } finally {
      setIsDeletingInbox(false);
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalStep('idle');
    setInstanceName('');
    setErrorMessage('');
    setQrCodeData('');
    setConnectionState('connecting');
    setOrchestrationStatus({
      instance: 'pending',
      integration: 'pending',
      qrcode: 'pending'
    });
    stopPolling();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    stopPolling();
  };

  // Inicia o processo principal de orquestração
  const handleStartIntegration = async (forceRecreate: boolean = false) => {
    if (!instanceName.trim()) {
      setErrorMessage('Por favor, informe o nome da instância.');
      setModalStep('error');
      return;
    }

    setModalStep('orchestrating');
    setErrorMessage('');
    
    try {
      // Opcional: Se for forçado a recriação, exclui primeiro
      if (forceRecreate) {
        setOrchestrationStatus(prev => ({ ...prev, instance: 'loading' }));
        try {
          await deleteInstance(instanceName);
        } catch (e) {
          // Ignora erro se a instância não existia
        }
      }

      // 1. Criar Instância
      setOrchestrationStatus(prev => ({ ...prev, instance: 'loading' }));
      try {
        await createInstance(instanceName);
        setOrchestrationStatus(prev => ({ ...prev, instance: 'success' }));
      } catch (err: any) {
        // Se a instância já existir, oferece opção de decisão ao usuário
        if (err.message.includes('already exists') || err.message.includes('400') || err.message.includes('409')) {
          setOrchestrationStatus(prev => ({ ...prev, instance: 'error' }));
          setModalStep('instance-exists');
          return;
        }
        throw err;
      }

      // 2. Verificar Estado antes de prosseguir
      setOrchestrationStatus(prev => ({ ...prev, qrcode: 'loading' }));
      const responseState = await getConnectionState(instanceName);
      const state = responseState.instance?.state;

      if (state === 'open') {
        // Já está conectada! Configura a integração Chatwoot imediatamente
        setOrchestrationStatus(prev => ({ ...prev, qrcode: 'success', integration: 'loading' }));
        await setChatwootIntegration(instanceName);
        setOrchestrationStatus(prev => ({ ...prev, integration: 'success' }));
        setModalStep('success');
        
        refetch();
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1500);
      } else {
        // Não está conectada. Gerar QR Code para escaneamento
        await fetchAndShowQRCode();
        setOrchestrationStatus(prev => ({ ...prev, qrcode: 'success' }));
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Ocorreu um erro desconhecido durante a integração.');
      setModalStep('error');
    }
  };

  // Trata o caso de usar instância existente
  const handleUseExistingInstance = async () => {
    setModalStep('orchestrating');
    setOrchestrationStatus({
      instance: 'success', // assume existente como ok
      integration: 'pending',
      qrcode: 'loading'
    });

    try {
      const responseState = await getConnectionState(instanceName);
      const state = responseState.instance?.state;

      if (state === 'open') {
        // Já conectada! Configura a integração Chatwoot imediatamente
        setOrchestrationStatus(prev => ({ ...prev, qrcode: 'success', integration: 'loading' }));
        await setChatwootIntegration(instanceName);
        setOrchestrationStatus(prev => ({ ...prev, integration: 'success' }));
        setModalStep('success');
        
        refetch();
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1500);
      } else {
        // Não conectada, exibe o QR Code para parear
        await fetchAndShowQRCode();
        setOrchestrationStatus(prev => ({ ...prev, qrcode: 'success' }));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao conectar com a instância existente.');
      setModalStep('error');
    }
  };

  // Função para buscar e renderizar o QR Code da Evolution API
  const fetchAndShowQRCode = async () => {
    try {
      const response = await getQRCode(instanceName);
      const base64Data = response.base64 || response.qrcode?.base64 || response.code;

      if (!base64Data) {
        throw new Error('Não foi possível obter a imagem em Base64 do QR Code.');
      }

      // Formatar string base64 se necessário
      const qrCodeSrc = base64Data.startsWith('data:image/') 
        ? base64Data 
        : `data:image/png;base64,${base64Data}`;

      setQrCodeData(qrCodeSrc);
      setModalStep('qrcode');
      
      // Inicia Polling de status
      startConnectionStatePolling();
    } catch (err: any) {
      throw new Error(`Falha ao obter QR Code: ${err.message}`);
    }
  };

  // Realiza polling a cada 3 segundos verificando se o QR Code foi escaneado
  const startConnectionStatePolling = () => {
    stopPolling();
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await getConnectionState(instanceName);
        const state = response.instance?.state;

        if (state === 'open') {
          // CONECTADO COM SUCESSO!
          stopPolling();
          setModalStep('success');
          
          // Executa a integração com o Chatwoot tardiamente (após WhatsApp estar conectado!)
          (async () => {
            try {
              await setChatwootIntegration(instanceName);
            } catch (chatwootErr) {
              console.error("Falha ao integrar com Chatwoot pós-conexão:", chatwootErr);
            } finally {
              // Recarrega inboxes e fecha modal
              refetch();
              setTimeout(() => {
                setIsModalOpen(false);
              }, 1500);
            }
          })();
        } else {
          setConnectionState(state || 'connecting');
        }
      } catch (err) {
        // Ignora erros de polling temporários para evitar queda da modal
        console.warn('Erro no polling de status:', err);
      }
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            <Menu size={20} />
          </button>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <Smartphone size={24} className="text-brand-500" />
            Terminal de Conexões
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleOpenModal} className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs shadow-xl shadow-brand-500/10 uppercase tracking-wider transition-all">
            <Plus size={16} />
            Nova Conexão
          </button>
          <button onClick={refetch} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Sincronizar
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 no-scrollbar">
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Inboxes List */}
            <div className="space-y-6">
                <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest px-2">Canais Conectados (Inboxes)</h2>
                {loading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p className="text-sm font-bold">Carregando canais...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-100 dark:border-red-800 shadow-sm p-10 text-center text-red-500 dark:text-red-400">
                        <p className="text-sm font-bold">Erro ao carregar</p>
                        <p className="text-xs">{error}</p>
                    </div>
                ) : inboxes.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center justify-center text-slate-400">
                        <Inbox size={48} className="mb-4 opacity-50" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum canal conectado</p>
                        <p className="text-xs font-medium mt-2">Crie conexões com o WhatsApp usando o botão acima.</p>
                    </div>
                ) : (
                    inboxes.map(inbox => (
                        <div key={inbox.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 sm:p-8 bg-emerald-50/40 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${getChannelConfig(inbox.channel_type).color}`}>
                                        {getChannelConfig(inbox.channel_type).icon}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight truncate">{inbox.name}</h3>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border mt-1 ${getChannelConfig(inbox.channel_type).badgeColor}`}>
                                            <CheckCircle2 size={10} />
                                            {getChannelConfig(inbox.channel_type).label}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleOpenDeleteConfirm(inbox)}
                                    className="p-3 bg-white/80 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-2xl border border-slate-200/50 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-800 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center shadow-sm"
                                    title="Excluir Conexão"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="p-6 sm:p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                    <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ID do Canal (Inbox)</p>
                                        <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">#{inbox.id}</p>
                                    </div>
                                    <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saudação</p>
                                        <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">{inbox.greeting_enabled ? 'Ativada' : 'Desativada'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Integration Details */}
            <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <QrCode size={22} className="text-brand-500" />
                        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">Como adicionar canais?</h3>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-start gap-5">
                            <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 text-xs font-black text-white shadow-lg shadow-slate-950/10">1</div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">Clique no botão **"Nova Conexão"** no cabeçalho desta tela.</p>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 text-xs font-black text-white shadow-lg shadow-slate-950/10">2</div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                              Informe o nome desejado da instância do WhatsApp e clique em avançar.
                            </p>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 text-xs font-black text-white shadow-lg shadow-slate-950/10">3</div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">Escore o QR Code gerado na tela com o seu WhatsApp corporativo. O canal sincronizará no Chatwoot e surgirá aqui automaticamente!</p>
                        </div>
                    </div>
                </div>

                <div className="bg-brand-50 dark:bg-brand-900/20 rounded-3xl border border-brand-100 dark:border-brand-800 p-8 flex items-start gap-5 group hover:border-brand-300 dark:hover:border-brand-600 transition-all duration-300">
                    <div className="p-3 bg-brand-500 rounded-2xl text-slate-950 shadow-xl shadow-brand-500/20 group-hover:scale-110 transition-transform">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-xs text-brand-900 dark:text-brand-300 uppercase tracking-widest mb-2">Integração VPS Avançada</h4>
                        <p className="text-[11px] text-brand-800 dark:text-brand-400 font-bold leading-relaxed opacity-80">
                            A conexão entre o CaenCRM e a Evolution API VPS utiliza chaves de autenticação globais seguras. A criação e integração nativa com o Chatwoot ocorrem de forma 100% automatizada e assíncrona.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL DE PROVISIONAMENTO DA EVOLUTION API & QR CODE */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col my-8">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <Smartphone size={20} className="text-brand-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider">Nova Conexão WhatsApp</h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 flex flex-col justify-center">
              
              {/* STEP 1: IDLE / CONFIGURAÇÃO DO NOME */}
              {modalStep === 'idle' && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                      <Link2 size={24} />
                    </div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Nome da Instância</h4>
                    <p className="text-xs font-semibold text-slate-400">Insira um nome único de identificação para a sua conexão com a Evolution API.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Dispositivo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: whatsapp-suporte"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <button 
                    onClick={() => handleStartIntegration()}
                    className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-xl shadow-brand-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    Iniciar Integração
                  </button>
                </div>
              )}

              {/* STEP 2: ORCHESTRATING (PROVISIONAMENTO SEQUENCIAL) */}
              {modalStep === 'orchestrating' && (
                <div className="space-y-6 py-4">
                  <div className="text-center space-y-2 mb-6">
                    <Loader2 size={36} className="text-brand-500 animate-spin mx-auto" />
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Provisionando Conexão</h4>
                    <p className="text-xs font-semibold text-slate-400">Aguarde enquanto executamos a orquestração na sua VPS...</p>
                  </div>

                  <div className="space-y-4">
                    {/* Linha 1: Instância */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">1. Criar Instância na Evolution API</span>
                      {orchestrationStatus.instance === 'pending' && <span className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-600" />}
                      {orchestrationStatus.instance === 'loading' && <Loader2 size={16} className="text-brand-500 animate-spin" />}
                      {orchestrationStatus.instance === 'success' && <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center"><Check size={12} className="stroke-[3]" /></div>}
                      {orchestrationStatus.instance === 'error' && <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={12} className="stroke-[3]" /></div>}
                    </div>

                    {/* Linha 2: Integração Chatwoot */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">2. Integrar e Criar Inbox no Chatwoot</span>
                      {orchestrationStatus.integration === 'pending' && <span className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-600" />}
                      {orchestrationStatus.integration === 'loading' && <Loader2 size={16} className="text-brand-500 animate-spin" />}
                      {orchestrationStatus.integration === 'success' && <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center"><Check size={12} className="stroke-[3]" /></div>}
                      {orchestrationStatus.integration === 'error' && <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={12} className="stroke-[3]" /></div>}
                    </div>

                    {/* Linha 3: QR Code */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">3. Gerar QR Code para Pareamento</span>
                      {orchestrationStatus.qrcode === 'pending' && <span className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-600" />}
                      {orchestrationStatus.qrcode === 'loading' && <Loader2 size={16} className="text-brand-500 animate-spin" />}
                      {orchestrationStatus.qrcode === 'success' && <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center"><Check size={12} className="stroke-[3]" /></div>}
                      {orchestrationStatus.qrcode === 'error' && <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={12} className="stroke-[3]" /></div>}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP: INSTANCE EXISTS DECISION DIALOG */}
              {modalStep === 'instance-exists' && (
                <div className="space-y-5 py-2">
                  <div className="text-center space-y-2 text-amber-500 mb-2">
                    <AlertTriangle size={36} className="mx-auto" />
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Instância Existente</h4>
                    <p className="text-xs font-semibold text-slate-400">Uma instância chamada <span className="text-slate-800 dark:text-slate-200 font-bold">"{instanceName}"</span> já foi criada anteriormente na Evolution API.</p>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed mb-4">
                    Você pode optar por vincular esta instância pré-existente ao Chatwoot, ou excluí-la permanentemente para gerar uma conexão totalmente limpa e do zero.
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={handleUseExistingInstance}
                      className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Link2 size={14} />
                      Usar Instância Existente
                    </button>
                    
                    <button 
                      onClick={() => handleStartIntegration(true)}
                      className="w-full py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      Excluir Antiga e Recriar
                    </button>

                    <button 
                      onClick={() => setModalStep('idle')}
                      className="w-full py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs transition-colors"
                    >
                      Voltar e Mudar Nome
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: QR CODE RENDERING & POLLING */}
              {modalStep === 'qrcode' && (
                <div className="space-y-6 py-2 flex flex-col items-center">
                  <div className="text-center space-y-1">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Escaneie o QR Code</h4>
                    <p className="text-[11px] font-semibold text-slate-400">Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar Aparelho</p>
                  </div>

                  {/* QR Code Frame */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-inner relative flex items-center justify-center w-60 h-60">
                    {qrCodeData ? (
                      <img 
                        src={qrCodeData} 
                        alt="WhatsApp Evolution QR Code" 
                        className="w-52 h-52 object-contain rounded-xl"
                      />
                    ) : (
                      <Loader2 size={32} className="text-brand-500 animate-spin" />
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800">
                    <Loader2 size={12} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Aguardando Escaneamento ({connectionState})</span>
                  </div>

                  {/* Actions inside QR code step */}
                  <div className="w-full flex gap-3 pt-2">
                    <button 
                      onClick={fetchAndShowQRCode}
                      className="flex-1 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl text-xs uppercase tracking-widest transition-all"
                    >
                      Regerar QR Code
                    </button>
                    <button 
                      onClick={handleCloseModal}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-md"
                    >
                      Concluído / Sair
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: SUCCESS OVERLAY */}
              {modalStep === 'success' && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-100/50 scale-110 animate-bounce">
                    <CheckCircle2 size={36} className="fill-emerald-600 dark:fill-emerald-400 text-white dark:text-slate-900" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-lg">WhatsApp Conectado!</h4>
                    <p className="text-xs font-semibold text-slate-400 px-4 leading-relaxed">O dispositivo foi pareado e a integração com o Chatwoot está 100% ativa. O CaenCRM está atualizando sua lista de canais...</p>
                  </div>
                  <div className="w-full py-2 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="text-brand-500 animate-spin" />
                    <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">Sincronizando Banco de Dados...</span>
                  </div>
                </div>
              )}

              {/* STEP 5: ERROR FEEDBACK */}
              {modalStep === 'error' && (
                <div className="space-y-5 py-2">
                  <div className="text-center space-y-2 text-red-500">
                    <AlertCircle size={36} className="mx-auto" />
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Falha na Conexão</h4>
                    <p className="text-xs font-semibold text-slate-400 leading-relaxed px-2">Não conseguimos orquestrar a conexão automática com o seu servidor VPS da Evolution API.</p>
                  </div>

                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 text-[11px] text-red-700 dark:text-red-400 font-bold leading-relaxed max-h-32 overflow-y-auto no-scrollbar">
                    {errorMessage || 'Erro inesperado. Certifique-se de que a Evolution API está ativa na VPS e que o Chatwoot está respondendo corretamente.'}
                  </div>

                  <div className="space-y-2">
                    <button 
                      onClick={() => setModalStep('idle')}
                      className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-xl shadow-brand-500/10 transition-all flex items-center justify-center gap-2"
                    >
                      Tentar Novamente
                    </button>
                    <button 
                      onClick={handleCloseModal}
                      className="w-full py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl text-xs uppercase tracking-widest transition-all"
                    >
                      Cancelar e Sair
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMAÇÃO DE DELEÇÃO DE INBOX */}
      {/* ======================================================== */}
      {inboxToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Excluir Conexão?</h4>
                <p className="text-xs font-semibold text-slate-400 px-2 leading-relaxed">
                  Isso removerá permanentemente a Inbox <span className="text-slate-800 dark:text-slate-200 font-bold">"{inboxToDelete.name}"</span> do Chatwoot e excluirá a instância correspondente na VPS da Evolution API.
                </p>
              </div>

              {deleteErrorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 text-[10px] text-red-700 dark:text-red-400 font-semibold leading-relaxed text-left">
                  {deleteErrorMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleCloseDeleteConfirm}
                  disabled={isDeletingInbox}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-600 dark:text-slate-300 font-black rounded-xl text-xs uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleExecuteDeleteInbox}
                  disabled={isDeletingInbox}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-600/10 flex items-center justify-center gap-1.5"
                >
                  {isDeletingInbox ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Excluir'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Connection;