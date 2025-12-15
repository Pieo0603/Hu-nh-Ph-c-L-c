import React, { useEffect, useState } from 'react';
import { ThemeConfig } from '../types';
import { ChatMessage } from '../services/geminiService';
import { Bot, User } from 'lucide-react';
import Markdown from 'react-markdown';

// Đổi tên Props sang tiếng Việt cho dễ hiểu
interface ChatBubbleProps {
  duLieuTinNhan: ChatMessage;
  cauHinhGiaoDien: ThemeConfig;
}

// Component phụ: Chịu trách nhiệm hiển thị nội dung Text + Toán học (LaTeX)
const BoHienThiNoiDung: React.FC<{ vanBan: string }> = ({ vanBan }) => {
  const [, setSanSang] = useState(false);

  useEffect(() => {
    // Kiểm tra xem thư viện Katex (hiển thị toán) đã tải xong chưa
    if ((window as any).katex) {
        setSanSang(true);
    } else {
        const t = setInterval(() => {
            if ((window as any).katex) {
                setSanSang(true);
                clearInterval(t);
            }
        }, 300);
        return () => clearInterval(t);
    }
  }, []);

  if (!vanBan) return null;

  // Regex để tách phần công thức toán học ra khỏi văn bản thường
  // $$...$$ hoặc \[...\] là công thức khối (Block math)
  // $...$ hoặc \(...\) là công thức dòng (Inline math)
  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([^\n\)]+?\\\))/g;
  const cacPhan = vanBan.split(regex);

  return (
    <div className="text-sm md:text-[15px] leading-7 break-words w-full">
      {cacPhan.map((phan, index) => {
        const laCongThucKhoi = (phan.startsWith('$$') && phan.endsWith('$$')) || (phan.startsWith('\\[') && phan.endsWith('\\]'));
        const laCongThucDong = (phan.startsWith('$') && phan.endsWith('$')) || (phan.startsWith('\\(') && phan.endsWith('\\)'));

        if (laCongThucKhoi) {
           // Xử lý hiển thị công thức toán dạng khối (xuống dòng riêng)
           const maTeX = phan.startsWith('$$') ? phan.slice(2, -2) : phan.slice(2, -2);
           try {
              const html = (window as any).katex?.renderToString(maTeX, { displayMode: true, throwOnError: false });
              return <div key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-2 py-1 overflow-x-auto max-w-full" />;
           } catch { 
              // Nếu lỗi thì hiển thị code gốc
              return <code key={index} className="block bg-black/30 p-2 rounded my-2 text-xs font-mono overflow-x-auto">{maTeX}</code>; 
           }
        } 
        else if (laCongThucDong) {
           // Xử lý hiển thị công thức toán cùng dòng
           const maTeX = phan.startsWith('$') ? phan.slice(1, -1) : phan.slice(2, -2);
           try {
              const html = (window as any).katex?.renderToString(maTeX, { displayMode: false, throwOnError: false });
              return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="mx-0.5" />;
           } catch { 
               return <span key={index} className="bg-black/30 px-1 rounded text-xs font-mono">{maTeX}</span>; 
           }
        } 
        else {
           // Xử lý văn bản thường (Markdown: in đậm, in nghiêng, list...)
           if (!phan) return null;
           return (
             <span key={index} className="markdown-content">
                <Markdown 
                    components={{
                        p: ({node, ...props}) => <span className="block mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="text-yellow-400 font-bold" {...props} />,
                        code: ({node, ...props}) => <code className="bg-white/10 text-pink-300 px-1.5 py-0.5 rounded text-xs font-mono border border-white/5" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-400 underline break-all" target="_blank" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-[#111] p-3 rounded-lg overflow-x-auto my-2 border border-white/10" {...props} />
                    }}
                >
                    {phan}
                </Markdown>
             </span>
           );
        }
      })}
    </div>
  );
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ duLieuTinNhan, cauHinhGiaoDien }) => {
  const laNguoiDung = duLieuTinNhan.role === 'user'; // Kiểm tra xem tin nhắn là của User hay Bot

  return (
    <div className={`flex w-full ${laNguoiDung ? 'justify-end' : 'justify-start'} mb-3 group`}>
      <div className={`flex max-w-[92%] md:max-w-[88%] gap-2 ${laNguoiDung ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar (Hình đại diện) */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-auto mb-1 shadow-lg ${laNguoiDung ? `bg-gradient-to-br ${cauHinhGiaoDien.buttonGradient}` : 'bg-indigo-600 border border-white/10'}`}>
            {laNguoiDung ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
        </div>

        {/* Bong bóng chat (Khung chứa nội dung) */}
        <div 
            className={`px-4 py-3 rounded-2xl shadow-md min-w-0 overflow-hidden relative ${
                laNguoiDung 
                ? `bg-white/10 text-white rounded-br-none border border-white/10` 
                : 'bg-[#252540] text-gray-100 rounded-bl-none border border-indigo-500/20'
            }`}
        >
            {/* Hiển thị ảnh nếu có */}
            {duLieuTinNhan.image && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black/50">
                    <img 
                        src={duLieuTinNhan.image} 
                        alt="Attachment" 
                        className="w-full h-auto max-h-[250px] object-contain cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => {
                             // Mở ảnh tab mới khi click
                             const w = window.open("");
                             w?.document.write(`<body style="margin:0;background:black;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${duLieuTinNhan.image}" style="max-width:100%;max-height:100%;"/></body>`);
                        }}
                    />
                </div>
            )}
            
            {/* Hiển thị nội dung text */}
            <BoHienThiNoiDung vanBan={duLieuTinNhan.text} />
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;