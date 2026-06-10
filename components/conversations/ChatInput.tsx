import React from 'react';
import { Smile, Paperclip, Mic, BookOpen, Sparkles, Maximize2, Loader2 } from 'lucide-react';

interface ChatInputProps {
  messageText: string;
  onMessageTextChange: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  activeTab: 'responder' | 'nota';
  onTabChange: (tab: 'responder' | 'nota') => void;
}

export default function ChatInput({ messageText, onMessageTextChange, onSend, isSending, activeTab, onTabChange }: ChatInputProps) {
  return (
    <div className="border-t border-[#222526] bg-[#151718] p-4 shrink-0 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => onTabChange('responder')}
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'responder'
                ? 'bg-[#222526] text-[#eceef0] border border-[#2e3234]'
                : 'text-[#889096] hover:text-[#eceef0]'
            }`}
          >
            Responder
          </button>
          <button
            onClick={() => onTabChange('nota')}
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'nota'
                ? 'bg-[#241e12] text-[#fbbf24] border border-[#d97706]/30'
                : 'text-[#889096] hover:text-[#eceef0]'
            }`}
          >
            Mensagem Privada
          </button>
        </div>
        <div className="flex items-center gap-3 text-[#889096]">
          <button className="p-1 hover:text-[#eceef0] transition-colors">
            <Sparkles size={14} className="text-purple-400" />
          </button>
          <button className="p-1 hover:text-[#eceef0] transition-colors">
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      <div className={`border rounded-xl p-2.5 flex flex-col gap-2 transition-all ${
        activeTab === 'nota'
          ? 'bg-[#1b1710] border-[#d97706]/30'
          : 'bg-[#0f1112] border-[#222526]'
      }`}>
        <textarea
          value={messageText}
          onChange={(e) => onMessageTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={
            activeTab === 'nota'
              ? "Digite uma nota privada visível apenas para agentes..."
              : "Shift + enter para nova linha. Digite '/' para selecionar uma Resposta Pronta."
          }
          rows={2}
          className="w-full bg-transparent border-none text-xs font-medium text-[#eceef0] placeholder-[#687076] focus:outline-none resize-none"
        />

        <div className="flex items-center justify-between pt-1 border-t border-[#222526]/50">
          <div className="flex items-center gap-3 text-[#889096]">
            <button className="p-1.5 hover:bg-[#222526]/50 rounded-lg hover:text-[#eceef0] transition-colors">
              <Smile size={16} />
            </button>
            <button className="p-1.5 hover:bg-[#222526]/50 rounded-lg hover:text-[#eceef0] transition-colors">
              <Paperclip size={16} />
            </button>
            <button className="p-1.5 hover:bg-[#222526]/50 rounded-lg hover:text-[#eceef0] transition-colors">
              <Mic size={16} />
            </button>
            <button className="p-1.5 hover:bg-[#222526]/50 rounded-lg hover:text-[#eceef0] transition-colors">
              <BookOpen size={16} />
            </button>
          </div>

          <button
            onClick={onSend}
            disabled={isSending || !messageText.trim()}
            className={`text-xs font-bold px-4.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              activeTab === 'nota'
                ? 'bg-[#d97706] hover:bg-[#b45309] text-white shadow-amber-900/10'
                : 'bg-[#0091ff] hover:bg-[#007cdb] text-white shadow-[#0091ff]/10'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSending ? (
              <Loader2 className="animate-spin" size={13} />
            ) : (
              <>
                <span>{activeTab === 'nota' ? 'Salvar Nota' : 'Enviar'}</span>
                <span className="text-[10px] opacity-75 font-normal">(Ctrl+↵)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
