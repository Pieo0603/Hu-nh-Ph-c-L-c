import React, { useState, useRef } from 'react';
import { Camera, Send, Sparkles, User, X, PenTool } from 'lucide-react';
import { generateWish } from '../services/geminiService';
import { Message, ThemeConfig } from '../types';

interface MessageFormProps {
  onAddMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  theme: ThemeConfig;
}

const MessageForm: React.FC<MessageFormProps> = ({ onAddMessage, theme }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH < img.width ? MAX_WIDTH : img.width;
          canvas.height = MAX_WIDTH < img.width ? img.height * scaleSize : img.height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
        return;
      }
      setIsCompressing(true);
      try {
        const compressedImage = await processImage(file);
        setImage(compressedImage);
      } catch (error) {
        console.error("Lỗi xử lý ảnh:", error);
        alert("Không thể xử lý ảnh này.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleGenerateWish = async () => {
    setIsGenerating(true);
    const wish = await generateWish();
    setContent(wish);
    setIsGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
        alert("Bạn chưa nhập nội dung lời chúc!");
        return;
    }

    try {
      await onAddMessage({
        author: isAnonymous ? 'Người bí ẩn' : (name || 'Bạn học'),
        content,
        isAnonymous,
        ...(image ? { imageUrl: image } : {}),
        avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${isAnonymous ? 'anon' : name}`,
      });

      setContent('');
      setImage(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert("Đã đăng lên bảng tin công khai! 🎉");
    } catch (error: any) {
      console.error("Lỗi gửi tin nhắn:", error);
      alert("Lỗi gửi tin: " + error.message);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto mt-12 mb-12 px-4 relative z-20">
      {/* Decorative Elements */}
      <div className={`absolute -inset-1 rounded-[2rem] bg-gradient-to-r ${theme.gradientTitle} opacity-30 blur-xl transition-all duration-500`}></div>
      
      <div className={`relative bg-[#0f0c29]/80 backdrop-blur-2xl rounded-[1.5rem] p-6 shadow-2xl border border-white/10 overflow-hidden`}>
        
        {/* Header Form */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
             <div className={`p-2.5 rounded-xl bg-gradient-to-br ${theme.buttonGradient} shadow-lg`}>
                <PenTool size={20} className="text-white" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Đăng bài công khai</h3>
                <p className="text-xs text-gray-400">Chia sẻ cảm xúc, ảnh kỷ niệm với mọi người</p>
             </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div className="relative group/input">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className={`text-gray-500 transition-colors duration-300`} />
            </div>
            <input
              type="text"
              placeholder="Tên của bạn (hoặc để trống)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAnonymous}
              className={`w-full bg-[#1a1a2e] border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-${theme.hex} focus:ring-1 focus:ring-${theme.hex} transition-all ${isAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Message Input */}
          <div className="relative group/input">
            <textarea
              placeholder="Bạn đang nghĩ gì? Gửi lời chúc, mục tiêu hoặc tâm sự..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full bg-[#1a1a2e] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-${theme.hex} focus:ring-1 focus:ring-${theme.hex} transition-all resize-none pb-12`} 
            />
            {/* AI Generator Button */}
            <button
              type="button"
              onClick={handleGenerateWish}
              disabled={isGenerating}
              className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 transition-all flex items-center gap-1.5 text-[10px] font-bold border border-white/10 hover:border-white/30`}
            >
              <Sparkles size={12} className={isGenerating ? "animate-spin text-yellow-400" : "text-yellow-400"} />
              {isGenerating ? 'AI Viết hộ' : 'AI Gợi ý'}
            </button>
          </div>

          {/* File Upload & Options */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
               <label className={`cursor-pointer flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white transition-all bg-[#1a1a2e] hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-3 w-full sm:w-auto justify-center ${isCompressing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Camera size={16} />
                  <span>
                    {isCompressing ? 'Đang nén ảnh...' : (image ? 'Đổi ảnh' : 'Ảnh kỷ niệm')}
                  </span>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                  />
               </label>
               {image && !isCompressing && (
                 <button 
                  type="button" 
                  onClick={() => {setImage(undefined); if(fileInputRef.current) fileInputRef.current.value = '';}}
                  className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
                  title="Xóa ảnh"
                 >
                   <X size={16} />
                 </button>
               )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none px-2 py-1 hover:bg-white/5 rounded-lg transition-colors">
              <input 
                type="checkbox" 
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className={`w-4 h-4 rounded border-gray-600 bg-gray-700 accent-pink-500`}
              />
              <span className="text-xs font-bold text-gray-400">Ẩn danh</span>
            </label>
          </div>
          
          {/* Image Preview */}
          {image && (
            <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden border border-white/10 shadow-inner group">
                <img src={image} alt="Preview" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCompressing || isGenerating}
            className={`w-full bg-gradient-to-r ${theme.buttonGradient} text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-${theme.id}/50 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-sm`}
          >
            <Send size={18} strokeWidth={2.5} />
            <span>Đăng lên bảng tin</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageForm;