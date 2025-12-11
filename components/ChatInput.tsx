import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { ThemeConfig } from '../types';

interface ChatInputProps {
  khiGuiTin: (text: string, image?: string) => void;
  dangXuLy: boolean;
  cauHinhGiaoDien: ThemeConfig;
}

const ChatInput: React.FC<ChatInputProps> = ({ khiGuiTin, dangXuLy, cauHinhGiaoDien }) => {
  const [noiDungNhap, setNoiDungNhap] = useState('');
  const [anhDaChon, setAnhDaChon] = useState<string | null>(null);
  
  // Refs để điều khiển DOM trực tiếp
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect: Tự động chỉnh độ cao khung nhập liệu khi nội dung thay đổi
  useEffect(() => {
    if (textareaRef.current) {
        // Reset về auto để đo độ cao thực tế
        textareaRef.current.style.height = 'auto';
        // Giới hạn chiều cao tối đa là 120px
        const doCaoMoi = Math.min(textareaRef.current.scrollHeight, 120);
        textareaRef.current.style.height = `${doCaoMoi}px`;
    }
  }, [noiDungNhap]);

  // Hàm xử lý khi chọn file ảnh từ máy
  const xuLyChonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.size > 5 * 1024 * 1024) {
          alert("Ảnh lớn quá (Max 5MB)!");
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (ev) => setAnhDaChon(ev.target?.result as string);
      reader.readAsDataURL(file);
  };

  // Hàm xử lý khi dán (Paste) ảnh từ Clipboard
  const xuLyDanAnh = (e: React.ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image'));
      if (item) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => setAnhDaChon(ev.target?.result as string);
              reader.readAsDataURL(file);
          }
      }
  };

  // Hàm xử lý khi bấm Gửi
  const xuLyGui = (e: React.FormEvent) => {
      e.preventDefault();
      // Nếu không có nội dung và không có ảnh, hoặc đang loading thì chặn
      if ((!noiDungNhap.trim() && !anhDaChon) || dangXuLy) return;
      
      // Gọi hàm callback từ cha
      khiGuiTin(noiDungNhap, anhDaChon || undefined);
      
      // Reset form về ban đầu
      setNoiDungNhap('');
      setAnhDaChon(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="p-3 bg-[#121212]/50 backdrop-blur-md">
        {/* Thanh hiển thị ảnh xem trước (Preview) */}
        {anhDaChon && (
            <div className="flex items-center justify-between bg-[#1f1f1f] p-2 rounded-lg mb-2 border border-white/10 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                    <img src={anhDaChon} alt="Preview" className="w-10 h-10 rounded object-cover border border-white/20" />
                    <span className="text-xs text-green-400 font-bold">Đã chọn ảnh</span>
                </div>
                <button 
                    onClick={() => setAnhDaChon(null)} 
                    className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
                    title="Xóa ảnh"
                >
                    <X size={16} />
                </button>
            </div>
        )}

        {/* Thanh nhập liệu chính */}
        <form onSubmit={xuLyGui} className="flex items-end gap-2">
            {/* Input file ẩn */}
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={xuLyChonFile} 
            />
            
            {/* Nút chọn ảnh */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={dangXuLy}
                className="p-3 mb-[2px] rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/5 flex-shrink-0"
                title="Gửi ảnh"
            >
                <ImageIcon size={20} />
            </button>

            {/* Ô nhập văn bản */}
            <div className="flex-grow relative">
                <textarea
                    ref={textareaRef}
                    value={noiDungNhap}
                    onChange={(e) => setNoiDungNhap(e.target.value)}
                    onPaste={xuLyDanAnh}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            xuLyGui(e);
                        }
                    }}
                    placeholder={anhDaChon ? "Thêm ghi chú..." : "Hỏi bài tập..."}
                    rows={1}
                    className="w-full bg-black/40 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors resize-none max-h-[120px] overflow-y-auto"
                    style={{ minHeight: '46px' }}
                />
            </div>
            
            {/* Nút Gửi */}
            <button 
                type="submit"
                disabled={(!noiDungNhap.trim() && !anhDaChon) || dangXuLy}
                className={`p-3 mb-[2px] rounded-xl flex-shrink-0 transition-all shadow-lg flex items-center justify-center ${
                    (!noiDungNhap.trim() && !anhDaChon) || dangXuLy
                    ? 'text-gray-600 bg-white/5 cursor-not-allowed' 
                    : `text-white bg-gradient-to-br ${cauHinhGiaoDien.buttonGradient} hover:scale-105 active:scale-95`
                }`}
            >
                <Send size={18} />
            </button>
        </form>
    </div>
  );
};

export default ChatInput;