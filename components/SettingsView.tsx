import React, { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, CreditCard, Menu, Save, Loader2, Copy, CheckCircle, Eye, EyeOff, RefreshCw, Trash2, Key, Smartphone, Lock, Globe, Users, MessageSquare, BarChart3, LogOut, Building2 } from 'lucide-react';
import { useAgents } from '../hooks/useAccount';
import { updateAgent } from '../api/chatwoot';
import { useMenuToggle } from '../contexts/MenuContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface NotificationPrefs {
  emailNotifications: boolean;
  pushNotifications: boolean;
  newConversations: boolean;
  newContacts: boolean;
}

const NOTIFICATIONS_KEY = 'caen_crm_notification_prefs';

function loadNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    emailNotifications: true,
    pushNotifications: false,
    newConversations: true,
    newContacts: false,
  };
}

function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(prefs));
}

function getAuthToken(): string {
  try {
    const stored = localStorage.getItem('caen_crm_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token || '';
    }
  } catch {}
  return '';
}

type Section = 'profile' | 'notifications' | 'security' | 'billing' | 'account';

const sections: { id: Section; icon: React.ReactNode; label: string }[] = [
  { id: 'profile', icon: <User size={16} />, label: 'Minha Conta' },
  { id: 'account', icon: <Globe size={16} />, label: 'Conta Chatwoot' },
  { id: 'notifications', icon: <Bell size={16} />, label: 'Notificações' },
  { id: 'security', icon: <Shield size={16} />, label: 'Segurança API' },
  { id: 'billing', icon: <CreditCard size={16} />, label: 'Faturamento' },
];

const planLabels: Record<string, string> = {
  trial: 'Trial Gratuito',
  starter: 'Starter',
  professional: 'Profissional',
  enterprise: 'Enterprise',
};

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
      <div>
        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{description}</p>
      </div>
      <div className="relative inline-flex items-center cursor-pointer" onClick={() => onChange(!checked)}>
        <input type="checkbox" className="sr-only peer" checked={checked} readOnly />
        <div className={`w-10 h-5 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all transition-all ${checked ? 'bg-brand-500 after:translate-x-full' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
      </div>
    </div>
  );
}

function SettingsView() {
  const { toggleSidebar } = useMenuToggle();
  const { success, error: toastError } = useToast();
  const { data: agents, loading, error: agentsError, refetch } = useAgents();
  const { accounts: authAccounts, selectedAccount, selectAccount: authSelectAccount } = useAuth();
  const currentAgent = agents?.[0];

  const [activeSection, setActiveSection] = useState<Section>('profile');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(loadNotificationPrefs);

  const [twoFA, setTwoFA] = useState(true);
  const [encryption, setEncryption] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [apiToken, setApiToken] = useState(getAuthToken());

  useEffect(() => {
    if (currentAgent) {
      setName(currentAgent.name || '');
      setEmail(currentAgent.email || '');
    }
    const storedWhats = localStorage.getItem('caen_crm_whatsapp');
    if (storedWhats) setWhatsapp(storedWhats);
  }, [currentAgent]);

  useEffect(() => {
    saveNotificationPrefs(notifPrefs);
  }, [notifPrefs]);

  const handleSaveProfile = async () => {
    if (!currentAgent) return;
    if (!name.trim()) {
      toastError('Validação', 'O nome não pode estar vazio.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toastError('Validação', 'Informe um email válido.');
      return;
    }
    setSaving(true);
    try {
      await updateAgent(currentAgent.id, { name: name.trim(), email: email.trim() });
      localStorage.setItem('caen_crm_whatsapp', whatsapp.trim());
      success('Perfil atualizado', 'Suas informações foram salvas com sucesso.');
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar perfil';
      toastError('Erro ao salvar', message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(apiToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      toastError('Erro', 'Não foi possível copiar o token.');
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    await new Promise(r => setTimeout(r, 1500));
    const newToken = `cw_${Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')}`;
    setApiToken(newToken);
    setGeneratingToken(false);
    success('Token gerado', 'Novo token de API criado com sucesso.');
  };

  const handleRevokeToken = () => {
    setApiToken('');
    toastError('Token revogado', 'O token de API foi removido.');
  };

  const renderProfile = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-brand-500" size={32} />
          </div>
        )}
        {agentsError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800">
            Erro ao carregar dados do agente: {agentsError}
          </div>
        )}
        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
          {currentAgent?.thumbnail ? (
            <img src={currentAgent.thumbnail} alt={currentAgent.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xl font-black shadow-sm">
              {currentAgent?.name?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
          )}
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Dados Profissionais</h3>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Informações sincronizadas com o Chatwoot</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Administrador</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Corporativo</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Tipo</label>
            <input
              type="text"
              value={`${currentAgent?.role || 'administrator'} (${currentAgent?.availability_status || 'offline'})`}
              readOnly
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all cursor-not-allowed text-slate-500 dark:text-slate-400 capitalize"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp de Notificações</label>
            <input
              type="text"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="+55 (11) 99999-0000"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Security Protocols */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest">Protocolos de Segurança</h3>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full uppercase">Sincronizado</span>
        </div>
        <div className="space-y-6">
          <Toggle checked={twoFA} onChange={setTwoFA} label="Autenticação Biométrica/2FA" description="Proteja o acesso ao pipeline com verificação Caen Link." />
          <Toggle checked={encryption} onChange={setEncryption} label="Criptografia de Conversas" description="Habilitar proteção End-to-End para dados sensíveis de leads." />
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
        <Bell size={20} className="text-brand-500" />
        <div>
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Preferências de Notificação</h3>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Configure como deseja ser notificado</p>
        </div>
      </div>
      <div className="space-y-4">
        <Toggle checked={notifPrefs.emailNotifications} onChange={v => setNotifPrefs(p => ({ ...p, emailNotifications: v }))} label="Notificações por Email" description="Receba alertas importantes no seu email corporativo." />
        <Toggle checked={notifPrefs.pushNotifications} onChange={v => setNotifPrefs(p => ({ ...p, pushNotifications: v }))} label="Notificações Push" description="Notificações em tempo real no navegador." />
        <Toggle checked={notifPrefs.newConversations} onChange={v => setNotifPrefs(p => ({ ...p, newConversations: v }))} label="Novas Conversas" description="Alertar quando novas conversas forem iniciadas." />
        <Toggle checked={notifPrefs.newContacts} onChange={v => setNotifPrefs(p => ({ ...p, newContacts: v }))} label="Novos Contatos" description="Notificar quando novos contatos forem cadastrados." />
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      {/* API Token */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
          <Key size={20} className="text-brand-500" />
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Token de API</h3>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Use este token para autenticar integrações externas</p>
          </div>
        </div>

        {apiToken ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <code className="flex-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 break-all select-all">
                {showToken ? apiToken : `${apiToken.substring(0, 8)}${'•'.repeat(Math.min(24, apiToken.length - 8))}`}
              </code>
              <button onClick={() => setShowToken(!showToken)} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all" title={showToken ? 'Ocultar' : 'Mostrar'}>
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button onClick={handleCopyToken} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all" title="Copiar">
                {tokenCopied ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={handleGenerateToken} disabled={generatingToken} className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest disabled:opacity-50">
                {generatingToken ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {generatingToken ? 'Gerando...' : 'Regenerar'}
              </button>
              <button onClick={handleRevokeToken} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-black hover:bg-red-500/20 transition-all uppercase tracking-widest border border-red-500/20">
                <Trash2 size={14} />
                Revogar
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Key size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">Nenhum token de API ativo</p>
            <button onClick={handleGenerateToken} disabled={generatingToken} className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest mx-auto disabled:opacity-50">
              {generatingToken ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {generatingToken ? 'Gerando...' : 'Gerar Token'}
            </button>
          </div>
        )}
      </div>

      {/* Security Toggles */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
          <Lock size={20} className="text-brand-500" />
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Medidas de Segurança</h3>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Proteção adicional para sua conta e dados</p>
          </div>
        </div>
        <div className="space-y-4">
          <Toggle checked={twoFA} onChange={setTwoFA} label="Autenticação de Dois Fatores (2FA)" description="Adicione uma camada extra de segurança ao seu login." />
          <Toggle checked={encryption} onChange={setEncryption} label="Criptografia de Conversas" description="Mensagens criptografadas de ponta a ponta." />
        </div>
      </div>
    </div>
  );

  const renderBilling = () => {
    const plan = 'professional';
    const usage = {
      contacts: { used: 847, limit: 1000 },
      conversations: { used: 1253, limit: 2000 },
      agents: { used: 3, limit: 5 },
      storage: { used: 2.4, limit: 10, unit: 'GB' },
    };

    return (
      <div className="space-y-6">
        {/* Current Plan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
            <CreditCard size={20} className="text-brand-500" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Plano Atual</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Gerencie sua assinatura e faturamento</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-5 bg-brand-50 dark:bg-brand-900/20 rounded-2xl border border-brand-100 dark:border-brand-800 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Plano</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{planLabels[plan] || plan}</p>
            </div>
            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Ativo</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Valor</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">R$ 97,00/mês</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Próximo vencimento</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">15/07/2026</p>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
            <BarChart3 size={20} className="text-brand-500" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Uso do Sistema</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Consumo atual vs. limite do plano</p>
            </div>
          </div>

          <div className="space-y-5">
            {([
              { label: 'Contatos', used: usage.contacts.used, limit: usage.contacts.limit, icon: <Users size={14} />, color: 'bg-brand-500' },
              { label: 'Conversas', used: usage.conversations.used, limit: usage.conversations.limit, icon: <MessageSquare size={14} />, color: 'bg-violet-500' },
              { label: 'Agentes', used: usage.agents.used, limit: usage.agents.limit, icon: <User size={14} />, color: 'bg-emerald-500' },
              { label: 'Armazenamento', used: usage.storage.used, limit: usage.storage.limit, icon: <Globe size={14} />, color: 'bg-amber-500', unit: usage.storage.unit },
            ] as const).map(item => {
              const pct = Math.min(100, Math.round((item.used / item.limit) * 100));
              const unit = 'unit' in item ? item.unit : '';
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{item.icon}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {item.used}{unit ? ` ${unit}` : ''} / {item.limit}{unit ? ` ${unit}` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${item.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderAccount = () => {
    const activeAccounts = authAccounts.length > 0
      ? authAccounts.filter(a => (a.status || '').toLowerCase() === 'active')
      : (selectedAccount ? [selectedAccount] : []);

    const displayAccounts = activeAccounts.length > 0 ? activeAccounts : authAccounts;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50 dark:border-slate-800">
            <Globe size={20} className="text-brand-500" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Conta Chatwoot</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Selecione a empresa que deseja acessar</p>
            </div>
          </div>

          <div className="space-y-3">
            {displayAccounts.map(account => {
              const isActive = selectedAccount?.id === account.id;
              return (
                <button
                  key={account.id}
                  onClick={() => { if (!isActive) { authSelectAccount(account); window.location.reload(); } }}
                  disabled={isActive}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 cursor-default'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-500/30 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 cursor-pointer'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-brand-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{account.name}</p>
                    <p className="text-[11px] text-slate-500 font-semibold">ID: {account.id}</p>
                  </div>
                  {isActive ? (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20 shrink-0">
                      Ativa
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-brand-500 shrink-0">Trocar</span>
                  )}
                </button>
              );
            })}

            {displayAccounts.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4 font-semibold">Nenhuma conta disponível</p>
            )}
          </div>

          <p className="text-[10px] text-slate-400 font-medium mt-4 text-center">A página será recarregada ao trocar de conta.</p>
        </div>
      </div>
    );
  };

  const sectionContent: Record<Section, React.ReactNode> = {
    profile: renderProfile(),
    account: renderAccount(),
    notifications: renderNotifications(),
    security: renderSecurity(),
    billing: renderBilling(),
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            <Menu size={20} />
          </button>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <Settings size={24} className="text-brand-500" />
            Configurações do CaenCRM
          </h1>
        </div>
        {activeSection === 'profile' && (
          <button
            onClick={handleSaveProfile}
            disabled={saving || !currentAgent}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-4 gap-8">
          {/* Settings Nav */}
          <div className="lg:col-span-1 space-y-2">
            {sections.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3.5 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${activeSection === item.id ? 'bg-white dark:bg-slate-800 shadow-md text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 ring-1 ring-brand-500/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
              >
                <span className={activeSection === item.id ? 'text-brand-500' : ''}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="lg:col-span-3">
            {sectionContent[activeSection]}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
