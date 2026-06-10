import React from 'react';
import { Bot, Save, Play, Settings2, Sparkles, MessageSquareCode, Menu } from 'lucide-react';
import { useMenuToggle } from '../contexts/MenuContext';

const AIAgent: React.FC = () => {
  const { toggleSidebar } = useMenuToggle();
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Caen AI Agent</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">Configure o núcleo de inteligência da sua agência</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-slate-950 rounded-xl text-xs font-black shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all uppercase tracking-widest">
          <Save size={16} />
          Atualizar Cérebro
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 no-scrollbar">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquareCode size={20} className="text-brand-500" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">Instruções de Sistema (Prompt Engenharia)</h3>
              </div>
              <textarea 
                className="w-full h-56 p-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs leading-relaxed font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:italic placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Ex: Você é um assistente de vendas gentil e prestativo da agência X..."
                defaultValue="Você é o assistente virtual Caen AI. Seu objetivo é operar como um consultor de vendas sênior. Qualifique leads através de perguntas consultivas, agende demonstrações utilizando links dinâmicos e resolva dúvidas técnicas de integração. Tom de voz: Profissional, Minimalista e Altamente Eficiente."
              />
              <div className="mt-4 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800">
                <p className="text-[10px] text-brand-800 dark:text-brand-300 font-bold leading-relaxed">
                   DICA CAEN: Utilize variáveis como {'{nome_lead}'} ou {'{empresa}'} para aumentar a conversão em 40%.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles size={20} className="text-brand-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">Processos Automatizados</h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Qualificação Instantânea', desc: 'Identifica o perfil do lead em tempo real e atualiza o CRM.', checked: true },
                  { label: 'Escalonamento Humano', desc: 'Alertas críticos para o consultor quando houver objeção de preço.', checked: true },
                  { label: 'Conversão em Agendamento', desc: 'Disparo automático de link de reunião após qualificação.', checked: false }
                ].map((action, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-brand-500/20 transition-all cursor-default">
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">{action.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{action.desc}</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={action.checked} />
                      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Settings2 size={20} className="text-slate-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">Engine IA</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Model Selection</label>
                  <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/10">
                    <option>Caen Engine v2.5 (High Performance)</option>
                    <option>Caen Engine Lite (Fast response)</option>
                    <option>Deep Analysis (Best for logic)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Temperature: Criatividade</label>
                  <input type="range" className="w-full accent-brand-500 cursor-pointer" />
                  <div className="flex justify-between text-[9px] text-slate-400 font-black mt-2">
                    <span>ASSERTIVO</span>
                    <span>CRIATIVO</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl group-hover:bg-brand-500/40 transition-all duration-700"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <Play size={20} className="text-brand-500 fill-brand-500" />
                  <h3 className="font-extrabold text-sm tracking-wider uppercase">Sandbox de Teste</h3>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-[140px] flex flex-col justify-center text-center">
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Simule uma conversa para validar o comportamento do seu Agente antes de publicar.</p>
                    <button className="mt-4 py-3 bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                        Iniciar Diagnóstico
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;