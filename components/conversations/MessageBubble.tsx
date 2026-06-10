import React from 'react';
import { Lock, CheckCheck } from 'lucide-react';
import type { ChatwootMessage } from '../../types/chatwoot';
import { formatMessageTime } from './utils';

interface MessageBubbleProps {
  message: ChatwootMessage;
  isIncoming: boolean;
  isActivity: boolean;
  isPrivate: boolean;
}

export default function MessageBubble({ message: msg, isIncoming, isActivity, isPrivate }: MessageBubbleProps) {
  if (isActivity) {
    return (
      <div className="flex justify-center my-4">
        <span className="px-3 py-1 bg-[#1c1e1f] text-[#889096] rounded-full text-[9px] font-bold uppercase tracking-widest border border-[#222526]/50">
          {msg.content}
        </span>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="flex justify-start my-2">
        <div className="max-w-[70%] rounded-[14px] rounded-tl-[4px] px-4 py-2.5 bg-[#241e12] border border-[#d97706]/20 text-[#fef08a] shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] text-[#fbbf24] mb-1 font-bold uppercase tracking-wider">
            <Lock size={10} />
            <span>Nota Privada por {msg.sender?.name || 'Agente'}</span>
          </div>
          <p className="text-xs leading-relaxed font-normal text-[#fde047]">{msg.content}</p>
          <span className="text-[9px] mt-1.5 block font-medium text-[#fbbf24]/60">
            {formatMessageTime(msg.created_at)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 items-end ${isIncoming ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[70%] rounded-[14px] px-4 py-2.5 shadow-sm ${
        isIncoming
          ? 'bg-[#202223] text-[#eceef0] rounded-tl-[4px]'
          : 'bg-[#154674] text-[#eceef0] rounded-tr-[4px]'
      }`}>
        {msg.sender?.type === 'user' && !isIncoming && (
          <div className="flex items-center gap-2 text-[10px] text-[#889096] mb-1 font-bold uppercase tracking-widest">
            {msg.sender.name}
          </div>
        )}
        <p className="text-xs leading-relaxed font-normal text-[#eceef0]">{msg.content}</p>
        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#889096]">
          <span>{formatMessageTime(msg.created_at)}</span>
          {!isIncoming && <CheckCheck size={11} className="text-[#0091ff]" />}
        </div>
      </div>

      {!isIncoming && (
        <div className="shrink-0 mb-1">
          {msg.sender?.thumbnail ? (
            <img src={msg.sender.thumbnail} alt={msg.sender.name} className="w-5 h-5 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#2e3234] text-[#eceef0] flex items-center justify-center text-[9px] font-bold shadow-sm">
              {msg.sender?.name?.substring(0, 1).toUpperCase() || 'A'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
