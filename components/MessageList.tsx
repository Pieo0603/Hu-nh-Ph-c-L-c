import React, { useState } from 'react';
import { Message, ThemeConfig } from '../types';
import { Quote, Maximize2, X, Download, Globe2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  theme: ThemeConfig;
}

const MessageList: React.FC<MessageListProps> = ({ messages, theme }) => {
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

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 pb-32 mt-12">
        {/* Header with Live Indicator */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <Globe2 size={28} className="text-blue-400" />
                <h2 className={`text-2xl md:text-3xl font-bold text-white uppercase tracking-wider drop-shadow-md`}>
                  Bảng Tin Công Khai
                </h2>
            </div>
            <p className="text-gray-400 text-sm md:text-base ml-10">
                Nơi lưu giữ những lời nhắn gửi đến toàn thể cộng đồng 2k8
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-black/20 px-4 py-2 rounded-full border border-white/5">
             <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Live Update</span>
             </div>
             <div className="h-4 w-[1px] bg-gray-600"></div>
             <div className="text-sm text-gray-300 font-medium">
                <span className={`${theme.text} font-bold text-lg`}>{messages.length}</span> lời chúc
             </div>
          </div>
        </div>

        {messages.length === 0 ? (
           <div className="text-center py-24 bg-white/5 rounded-3xl border border-white/5 border-dashed">
              <p className="text-gray-400 text-lg mb-2">Chưa có lời nhắn nào được ghim.</p>
              <p className="text-sm text-gray-500">Hãy là người đầu tiên truyền động lực cho mọi người!</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {messages.map((msg) => {
              const { date, time } = formatDate(msg.timestamp);
              return (
                <div 
                  key={msg.id} 
                  className="hover-shine glass-panel rounded-2xl p-6 flex flex-col justify-between h-full group hover:-translate-y-1 transition-transform duration-300 border border-white/5 hover:border-white/20"
                >
                  {/* Body: Content & Image */}
                  <div className="flex justify-between items-start gap-3 mb-4 flex-grow relative">
                    {/* Quote & Text */}
                    <div className="flex-1 min-w-0 z-10">
                      <Quote size={20} className="text-gray-500 mb-3 rotate-180" />
                      <p className="text-gray-200 text-[15px] font-medium leading-relaxed font-sans pl-1 break-words tracking-wide whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>

                    {/* Thumbnail Image */}
                    {msg.imageUrl && (
                      <div 
                          className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg border border-white/10 bg-black overflow-hidden shadow-lg transform rotate-2 group-hover:rotate-0 transition-all duration-500 cursor-zoom-in group/image"
                          onClick={() => setViewingImage(msg.imageUrl)}
                      >
                        <img 
                          src={msg.imageUrl} 
                          alt="attachment" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 size={20} className="text-white drop-shadow-lg" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer: Author, Date */}
                  <div className="pt-4 border-t border-white/5 flex items-end justify-between mt-auto">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={msg.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${msg.author}`} 
                          alt="avt" 
                          className="w-8 h-8 rounded-full border border-white/10 bg-white/5"
                        />
                        <span className={`text-sm font-bold ${msg.isAnonymous ? 'text-gray-500' : theme.text} line-clamp-1 max-w-[100px]`}>
                          {msg.author}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-end text-[10px] text-gray-500 font-bold leading-tight uppercase tracking-wider">
                        <span>{date}</span>
                        <span>{time}</span>
                      </div>
                  </div>
                </div>
              );
            })}
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