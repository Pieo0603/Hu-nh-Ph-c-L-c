import React, { useState, useRef, useEffect } from 'react';
import { Bot, Minimize2, Sparkles, Trash2, X, Maximize2 } from 'lucide-react';
import { ThemeConfig } from '../types';
import { getChatResponse, ChatMessage } from '../services/geminiService';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

interface AiAssistantProps {
  theme: ThemeConfig;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // State để phóng to full màn hình trên Desktop nếu muốn
  const [isMaximized, setIsMaximized] = useState(false); 

  const [messages, setMessages] = useState<ChatMessage[]>([
      { role: 'model', text: 'Chào cậu! 👋 Mình là trợ lý AI. Gửi ảnh đề bài hoặc câu hỏi qua đây mình giải chi tiết cho nhé!' }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (isOpen) {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (text: string, image?: string) => {
    const newHistory: ChatMessage[] = [...messages, { role: 'user', text: text.trim(), image }];
    setMessages(newHistory);
    setIsLoading(true);

    // Giả lập delay một chút cho tự nhiên nếu phản hồi quá nhanh
    const responseText = await getChatResponse(messages, text, image);

    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  const handleClearChat = () => {
      if(window.confirm("Bạn muốn xóa toàn bộ đoạn chat này?")) {
          setMessages([{ role: 'model', text: 'Đã dọn dẹp! Bắt đầu lại nào. 🚀' }]);
      }
  };

  // --- CẤU HÌNH CLASS CSS CHO KHUNG CHAT ---
  // 1. Mobile: fixed inset-0 (Full màn hình, dính 4 góc)
  // 2. Desktop (Bình thường): md:inset-auto (Hủy full màn) + md:bottom-6 md:right-6 (Góc phải) + md:w-[450px] md:h-[600px]
  // 3. Desktop (Phóng to): md:inset-4 (Cách lề 1rem) + md:w-auto md:h-auto
  const containerClasses = `
    fixed z-50 bg-[#1a1a2e] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-out border border-white/10
    ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none translate-y-10'}
    
    /* MOBILE DEFAULT: Full Screen */
    inset-0 w-full h-full rounded-none

    /* DESKTOP OVERRIDES */
    md:origin-bottom-right
    ${isMaximized 
        ? 'md:inset-6 md:rounded-2xl' // Desktop Full Mode
        : 'md:inset-auto md:bottom-6 md:right-6 md:w-[450px] md:h-[650px] md:rounded-2xl' // Desktop Compact Mode (Bottom Right)
    }
  `;

  return (
    <>
      {/* 1. NÚT KÍCH HOẠT TRÒN (Luôn hiển thị khi đóng chat) */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed z-40 bottom-24 right-6 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${theme.buttonGradient} shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-300 group border-2 border-white/20 ${isOpen ? 'opacity-0 pointer-events-none scale-0' : 'opacity-100 scale-100'}`}
      >
          <Bot size={28} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0f0c29] animate-pulse"></div>
      </button>

      {/* 2. KHUNG CHAT CHÍNH */}
      <div className={containerClasses}>
        
        {/* HEADER */}
        <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${theme.buttonGradient} flex-shrink-0 cursor-default select-none`}>
            <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-1.5 rounded-lg">
                    <Bot size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-sm leading-tight">Trợ lý AI</h3>
                    <p className="text-[10px] text-white/90 font-medium opacity-80 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></span>
                        Sẵn sàng hỗ trợ
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-1">
                <button onClick={handleClearChat} className="p-2 hover:bg-white/20 rounded-lg text-white/90 transition-colors" title="Xóa chat">
                    <Trash2 size={18} />
                </button>
                
                {/* Nút phóng to chỉ hiện trên Desktop */}
                <button onClick={() => setIsMaximized(!isMaximized)} className="hidden md:block p-2 hover:bg-white/20 rounded-lg text-white transition-colors" title="Phóng to/Thu nhỏ">
                    {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors">
                    {window.innerWidth < 768 ? <X size={20} /> : <Minimize2 size={20} />}
                </button>
            </div>
        </div>

        {/* BODY (MESSAGES) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 custom-scrollbar scroll-smooth">
            {messages.map((msg, idx) => (
                <ChatBubble key={idx} message={msg} theme={theme} />
            ))}
            
            {isLoading && (
                <div className="flex justify-start animate-pulse">
                    <div className="bg-[#252540] text-gray-300 px-4 py-3 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-2 text-sm shadow-md">
                        <Sparkles size={16} className="animate-spin text-yellow-400" />
                        <span>Đang suy nghĩ...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* FOOTER (INPUT) */}
        <div className="flex-shrink-0 z-20">
             <ChatInput 
                onSendMessage={handleSendMessage} 
                isLoading={isLoading} 
                theme={theme} 
            />
        </div>
      </div>
    </>
  );
};

export default AiAssistant;