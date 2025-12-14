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
  // --- TRẠNG THÁI (STATE) ---
  // Biến kiểm soát việc đóng/mở khung chat
  const [dangMoChat, setDangMoChat] = useState(false);
  
  // Biến kiểm soát trạng thái AI đang suy nghĩ (loading)
  const [dangXuLy, setDangXuLy] = useState(false);
  
  // Biến kiểm soát chế độ phóng to toàn màn hình trên PC
  const [cheDoToanManHinh, setCheDoToanManHinh] = useState(false); 

  // Danh sách lịch sử tin nhắn - KHỞI TẠO TỪ LOCALSTORAGE
  const [lichSuTinNhan, setLichSuTinNhan] = useState<ChatMessage[]>(() => {
    try {
      const savedChat = localStorage.getItem('ai_chat_history');
      if (savedChat) {
        return JSON.parse(savedChat);
      }
    } catch (error) {
      console.error("Lỗi tải lịch sử chat:", error);
    }
    return [
      { role: 'model', text: 'Chào cậu! 👋 Mình là trợ lý AI. Gửi ảnh đề bài hoặc câu hỏi qua đây mình giải chi tiết cho nhé!' }
    ];
  });
  
  // Ref để tự động cuộn xuống tin nhắn cuối cùng
  const cuoiDoanChatRef = useRef<HTMLDivElement>(null);

  // --- HIỆU ỨNG (EFFECT) ---
  
  // 1. Lưu lịch sử chat vào LocalStorage mỗi khi có thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('ai_chat_history', JSON.stringify(lichSuTinNhan));
    } catch (error) {
      console.error("Không thể lưu lịch sử chat (có thể do bộ nhớ đầy):", error);
    }
  }, [lichSuTinNhan]);

  // 2. Tự động cuộn xuống dưới khi có tin nhắn mới hoặc khi mở chat
  useEffect(() => {
    if (dangMoChat) {
        setTimeout(() => {
            cuoiDoanChatRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }
  }, [lichSuTinNhan, dangMoChat, dangXuLy]);

  // --- CÁC HÀM XỬ LÝ (HANDLERS) ---
  
  // Hàm gửi tin nhắn đi
  const xuLyGuiTin = async (noiDung: string, hinhAnh?: string) => {
    // 1. Thêm tin nhắn của người dùng vào danh sách ngay lập tức
    const lichSuMoi: ChatMessage[] = [...lichSuTinNhan, { role: 'user', text: noiDung.trim(), image: hinhAnh }];
    setLichSuTinNhan(lichSuMoi);
    setDangXuLy(true); // Bật trạng thái loading

    // 2. Gọi API để lấy phản hồi từ AI
    const phanHoiCuaAI = await getChatResponse(lichSuTinNhan, noiDung, hinhAnh);

    // 3. Thêm phản hồi của AI vào danh sách
    setLichSuTinNhan(prev => [...prev, { role: 'model', text: phanHoiCuaAI }]);
    setDangXuLy(false); // Tắt trạng thái loading
  };

  // Hàm xóa lịch sử chat
  const xoaLichSuChat = () => {
      if(window.confirm("Bạn muốn xóa toàn bộ đoạn chat này?")) {
          const resetChat: ChatMessage[] = [{ role: 'model', text: 'Đã dọn dẹp! Bắt đầu lại nào. 🚀' }];
          setLichSuTinNhan(resetChat);
          localStorage.setItem('ai_chat_history', JSON.stringify(resetChat));
      }
  };

  // --- CẤU HÌNH CSS (STYLE) ---
  // Logic vị trí: 
  // - Mobile: inset-0 (Full màn hình)
  // - PC (Mặc định): bottom-6 right-6 (Góc dưới phải)
  // - PC (Toàn màn hình): inset-6 (Cách lề 24px)
  // UPDATE: Z-Index tăng lên z-[80] để đè lên Timer (z-[60])
  const lopCssKhungChat = `
    fixed z-[80] bg-[#1a1a2e] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-out border border-white/10
    
    /* TRẠNG THÁI ĐÓNG/MỞ */
    ${dangMoChat 
        ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' 
        : 'opacity-0 scale-95 pointer-events-none translate-y-10'
    }
    
    /* --- MOBILE (Mặc định) --- */
    inset-0 w-full h-full rounded-none

    /* --- PC / TABLET (Màn hình lớn) --- */
    md:inset-auto md:origin-bottom-right
    ${cheDoToanManHinh 
        ? 'md:inset-6 md:rounded-2xl' // Chế độ Phóng to
        : 'md:bottom-6 md:right-6 md:w-[450px] md:h-[650px] md:rounded-2xl' // Chế độ Thu gọn (Góc phải)
    }
  `;

  return (
    <>
      {/* 1. NÚT TRÒN ĐỂ MỞ CHAT (Chỉ hiện khi đang đóng chat) */}
      {/* UPDATE: Z-Index tăng lên z-[70] để đè lên Timer */}
      <button
        onClick={() => setDangMoChat(true)}
        className={`fixed z-[70] bottom-24 right-6 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${theme.buttonGradient} shadow-xl flex items-center justify-center text-white hover:scale-105 hover:bg-white/10 transition-transform duration-300 group border-2 border-white/20 ${dangMoChat ? 'opacity-0 pointer-events-none scale-0' : 'opacity-100 scale-100'}`}
      >
          <Bot size={28} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0f0c29] animate-pulse"></div>
      </button>

      {/* 2. KHUNG CHAT CHÍNH */}
      <div className={lopCssKhungChat}>
        
        {/* THANH TIÊU ĐỀ (HEADER) */}
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
                {/* Nút xóa */}
                <button onClick={xoaLichSuChat} className="p-2 hover:bg-white/20 rounded-lg text-white/90 transition-colors" title="Làm mới cuộc trò chuyện">
                    <Trash2 size={18} />
                </button>
                
                {/* Nút phóng to/thu nhỏ (Chỉ hiện trên PC) */}
                <button onClick={() => setCheDoToanManHinh(!cheDoToanManHinh)} className="hidden md:block p-2 hover:bg-white/20 rounded-lg text-white transition-colors" title={cheDoToanManHinh ? "Thu nhỏ" : "Phóng to"}>
                    {cheDoToanManHinh ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                {/* Nút đóng */}
                <button onClick={() => setDangMoChat(false)} className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* DANH SÁCH TIN NHẮN (BODY) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 custom-scrollbar scroll-smooth">
            {lichSuTinNhan.map((tinNhan, index) => (
                <ChatBubble key={index} duLieuTinNhan={tinNhan} cauHinhGiaoDien={theme} />
            ))}
            
            {/* Hiệu ứng loading khi AI đang nghĩ */}
            {dangXuLy && (
                <div className="flex justify-start animate-pulse">
                    <div className="bg-[#252540] text-gray-300 px-4 py-3 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-2 text-sm shadow-md">
                        <Sparkles size={16} className="animate-spin text-yellow-400" />
                        <span>Đang suy nghĩ...</span>
                    </div>
                </div>
            )}
            {/* Điểm neo để cuộn xuống */}
            <div ref={cuoiDoanChatRef} className="h-1" />
        </div>

        {/* KHUNG NHẬP LIỆU (FOOTER) */}
        <div className="flex-shrink-0 z-20">
             <ChatInput 
                khiGuiTin={xuLyGuiTin} 
                dangXuLy={dangXuLy} 
                cauHinhGiaoDien={theme} 
            />
        </div>
      </div>
    </>
  );
};

export default AiAssistant;