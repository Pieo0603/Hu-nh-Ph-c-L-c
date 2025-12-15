import React, { useState } from 'react';
import { Message, ThemeConfig } from '../types';
import { Quote, Maximize2, X, Download, Globe2, MessageCircle, ArrowUp } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  theme: ThemeConfig;
  onViewProfile?: (userId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, theme, onViewProfile }) => {
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleDownload = (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `kyniem_thpt2026_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const scrollToForm = () => {
    const formElement = document.getElementById('message-form');
    if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUserClick = (userId?: string) => {
      if (userId && onViewProfile) {
          onViewProfile(userId);
      }
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 pb-32 mt-12">
        {/* Header with Live Indicator */}
        <div className="flex flex-col items-center justify-center mb-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Public Live Feed</span>
          </div>
          
          <h2 className={`text-3xl md:text-5xl font-black text-white uppercase tracking-wider drop-shadow-lg flex items-center gap-3 justify-center`}>
             <Globe2 className={`w-8 h-8 md:w-12 md:h-12 ${theme.text}`} />
             BẢNG TIN CỘNG ĐỒNG
          </h2>
          
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto font-light">
             Nơi lưu giữ {messages.length > 0 ? <span className="text-white font-bold">{messages.length}</span> : ''} lời nhắn gửi, lời chúc và những khoảnh khắc đáng nhớ của 2k8 trên toàn quốc.
          </p>
        </div>

        {messages.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-3xl border border-white/5 border-dashed max-w-2xl mx-auto">
              <div className="bg-white/10 p-4 rounded-full mb-4">
                  <MessageCircle size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-300 text-xl font-bold mb-2">Bảng tin đang trống</p>
              <p className="text-sm text-gray-500">Hãy là người đầu tiên viết lên những dòng tâm sự này!</p>
           </div>
        ) : (
          /* MASONRY LAYOUT USING CSS COLUMNS */
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 mx-auto">
            {messages.map((msg) => {
              const { date, time } = formatDate(msg.timestamp);
              const canViewProfile = !!msg.userId;

              return (
                <div 
                  key={msg.id} 
                  className="break-inside-avoid mb-6 hover-shine glass-panel rounded-2xl p-5 flex flex-col group hover:-translate-y-1 transition-transform duration-300 border border-white/5 hover:border-white/20 bg-[#121212]/40 backdrop-blur-xl shadow-xl"
                >
                  {/* Header: Author Info */}
                  <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-3">
                      <img 
                        src={msg.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${msg.author}`} 
                        alt="avt" 
                        className={`w-9 h-9 rounded-full border border-white/10 bg-white/5 shadow-sm object-cover ${canViewProfile ? 'cursor-pointer hover:border-white/50 transition-colors' : ''}`}
                        onClick={() => handleUserClick(msg.userId)}
                      />
                      <div className="flex flex-col min-w-0">
                        <span 
                            className={`text-sm font-bold truncate ${msg.isAnonymous ? 'text-gray-400 italic' : theme.text} ${canViewProfile ? 'cursor-pointer hover:underline' : ''}`}
                            onClick={() => handleUserClick(msg.userId)}
                        >
                          {msg.author}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {date} lúc {time}
                        </span>
                      </div>
                  </div>

                  {/* Body: Content */}
                  <div className="mb-4 relative z-10">
                      {msg.content && (
                        <div className="relative pl-2">
                           <Quote size={14} className="absolute -left-1 -top-1 text-gray-600 rotate-180 opacity-50" />
                           <p className="text-gray-200 text-[15px] leading-relaxed font-sans whitespace-pre-wrap break-words">
                            {msg.content}
                           </p>
                        </div>
                      )}
                  </div>

                  {/* Image Attachment (Full Width) */}
                  {msg.imageUrl && (
                    <div 
                        className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-black shadow-inner cursor-zoom-in group/image mt-1"
                        onClick={() => setViewingImage(msg.imageUrl || null)}
                    >
                      <img 
                        src={msg.imageUrl} 
                        alt="attachment" 
                        className="w-full h-auto object-cover transform group-hover/image:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 size={24} className="text-white drop-shadow-lg" />
                      </div>
                    </div>
                  )}

                  {/* Footer Decoration */}
                  <div className="mt-3 flex justify-end">
                     <div className="h-1 w-12 rounded-full bg-white/5"></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM CALL TO ACTION */}
        {messages.length > 5 && (
            <div className="mt-16 text-center animate-in slide-in-from-bottom-4">
                <p className="text-gray-400 text-sm mb-4">Bạn cũng có điều muốn nói?</p>
                <button 
                    onClick={scrollToForm}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all hover:scale-105`}
                >
                    <ArrowUp size={16} />
                    <span>Viết lời chúc ngay</span>
                </button>
            </div>
        )}

      </div>

      {/* Image Modal / Lightbox */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
            onClick={() => setViewingImage(null)}
          >
            <X size={24} />
          </button>

          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center pointer-events-none">
            <img 
              src={viewingImage} 
              alt="Full view" 
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl border border-white/10 object-contain pointer-events-auto"
              onClick={(e) => e.stopPropagation()} 
            />

            <div className="mt-6 flex gap-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
               <button 
                  onClick={(e) => handleDownload(e, viewingImage)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold shadow-lg hover:scale-105 transition-transform`}
               >
                  <Download size={18} />
                  <span>Lưu ảnh về máy</span>
               </button>
            </div>
            
            <p className="mt-4 text-gray-500 text-sm">Nhấn ra ngoài hoặc bấm ESC để đóng</p>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageList;