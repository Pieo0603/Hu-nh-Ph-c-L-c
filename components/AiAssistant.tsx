import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, MessageCircle, Minimize2 } from 'lucide-react';
import { ThemeConfig } from '../types';
import { getChatResponse, ChatMessage } from '../services/geminiService';

interface AiAssistantProps {
  theme: ThemeConfig;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
      { role: 'model', text: 'Chào cậu! 👋 Mình là trợ lý AI. Cậu cần giúp giải bài tập hay tâm sự mỏng không?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    // Add user message
    const newHistory: ChatMessage[] = [...messages, { role: 'user', text: userMsg }];
    setMessages(newHistory);
    setIsLoading(true);

    // Call API
    const responseText = await getChatResponse(messages, userMsg);

    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  return (
    <>
      {/* TRIGGER BUTTON (Floating) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-24 right-6 z-40 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${theme.buttonGradient} shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-300 animate-in fade-in zoom-in group border-2 border-white/20`}
        >
          <Bot size={28} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0f0c29] animate-pulse"></div>
        </button>
      )}

      {/* CHAT WINDOW */}
      <div 
        className={`fixed z-50 transition-all duration-300 ease-in-out flex flex-col overflow-hidden shadow-2xl border border-white/10 backdrop-blur-xl bg-[#1a1a2e]/95
          ${isOpen 
            ? 'bottom-6 right-6 w-[90vw] h-[60vh] md:w-[400px] md:h-[600px] rounded-2xl opacity-100 scale-100' 
            : 'bottom-24 right-6 w-0 h-0 rounded-full opacity-0 scale-0 pointer-events-none'
          }
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 bg-gradient-to-r ${theme.buttonGradient}`}>
            <div className="flex items-center gap-2 text-white">
                <Bot size={20} />
                <h3 className="font-bold">Trợ lý học tập AI</h3>
            </div>
            <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
                <Minimize2 size={18} />
            </button>
        </div>

        {/* Messages Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
            {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div 
                            className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                isUser 
                                ? `bg-gradient-to-br ${theme.buttonGradient} text-white rounded-tr-sm` 
                                : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                );
            })}
            
            {/* Loading Indicator */}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white/10 text-gray-400 p-3 rounded-2xl rounded-tl-sm border border-white/5 flex items-center gap-2 text-xs">
                        <Sparkles size={14} className="animate-spin text-yellow-400" />
                        Đang suy nghĩ...
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-[#121212]/50">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Hỏi bài hoặc tâm sự..."
                    className="w-full bg-black/30 border border-gray-600 text-white text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-white/50 transition-colors"
                />
                <button 
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`absolute right-2 p-2 rounded-lg ${!input.trim() ? 'text-gray-500' : `text-${theme.id}-400 hover:bg-white/10`} transition-all`}
                >
                    <Send size={18} />
                </button>
            </div>
            <div className="text-[10px] text-center text-gray-500 mt-2">
                Powered by Google Gemini AI
            </div>
        </form>
      </div>
    </>
  );
};

export default AiAssistant;