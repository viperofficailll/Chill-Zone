import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useForm } from 'react-hook-form';

interface ChatInterfaceProps {
  onSendMessage: (text: string) => void;
  mobileMode?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSendMessage, mobileMode }) => {
  const { messages } = useSelector((state: RootState) => state.chat);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset } = useForm<{ text: string }>();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSubmit = (data: { text: string }) => {
    if (data.text.trim()) {
      onSendMessage(data.text);
      reset();
    }
  };

  return (
    <div className={`flex flex-col h-full pointer-events-auto ${mobileMode ? '' : 'bg-[#111]'}`}>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
         {/* Welcome text only if empty */}
        {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
                 <p className="text-white/20 text-sm font-medium">Say hello...</p>
            </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] px-4 py-2 rounded-2xl backdrop-blur-md shadow-sm text-sm md:text-base ${
              msg.sender === 'me' 
                ? 'bg-blue-600/80 text-white rounded-br-sm' 
                : msg.sender === 'system'
                ? 'bg-transparent text-white/50 text-xs text-center w-full italic'
                : 'bg-white/10 border border-white/5 text-white rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 md:p-4 bg-transparent md:bg-black/20 md:border-t md:border-white/5">
         <form onSubmit={handleSubmit(onSubmit)} className="relative">
            <input
                {...register('text')}
                className="w-full bg-white/10 border border-white/10 rounded-full px-5 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:bg-white/15 focus:border-white/30 transition-all backdrop-blur-md text-sm md:text-base"
                placeholder="Type a message..."
                autoComplete="off"
            />
            <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition-colors shadow-lg"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
            </button>
         </form>
      </div>
    </div>
  );
};