import React, { useState, useRef } from 'react';
import { Camera, Send, Sparkles, User, X } from 'lucide-react';
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
        imageUrl: image,
        avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${isAnonymous ? 'anon' : name}`,
      });

      setContent('');
      setImage(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert("Gửi lời chúc thành công! 🎉");
    } catch (error: any) {
      console.error("Lỗi gửi tin nhắn:", error);
      alert("Lỗi gửi tin: " + error.message);
    }
  };

  return (
    // Updated spacing: Less margin top on mobile (mt-8)
    <div className="w-full max-w-lg mx-auto mt-8 md:mt-16 mb-20 px-4">
      {/* Updated padding: Less inner padding on mobile (p-5 instead of p-8) and slightly smaller rounded corners on mobile */}
      <div className={`glass-panel rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl transition-all duration-500 border border-white/10 hover:border-white/20`}>
        
        <h3 className={`text-xl font-bold text-center mb-6 md:mb-8 text-white tracking-wide`}>
          Gửi một chút tâm sự nhỏ
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          {/* Name Input */}
          <div className="relative group/input">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className={`text-gray-500 transition-colors duration-300`} />
            </div>
            <input
              type="text"
              placeholder="Tên của bạn (để trống nếu muốn ẩn danh)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAnonymous}
              className={`w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all ${isAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Message Input */}
          <div className="relative group/input">
            <textarea
              placeholder="Gửi lời tâm sự, lời chúc, động viên đến các bạn thí sinh..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-5 text-sm text-white placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all resize-none pb-10`} // Added pb-10 to prevent text overlap with AI button
            />
            {/* AI Generator Button */}
            <button
              type="button"
              onClick={handleGenerateWish}
              disabled={isGenerating}
              className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 transition-all flex items-center gap-1.5 text-[10px] font-bold border border-white/10 hover:border-white/30`}
            >
              <Sparkles size={12} className={isGenerating ? "animate-spin text-yellow-400" : "text-yellow-400"} />
              {isGenerating ? 'Đang viết...' : 'AI Gợi ý'}
            </button>
          </div>

          {/* File Upload & Options */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
               <label className={`cursor-pointer flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl px-4 py-3 w-full sm:w-auto justify-center ${isCompressing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Camera size={16} />
                  <span>
                    {isCompressing ? 'Đang xử lý...' : (image ? 'Đổi ảnh khác' : 'Thêm ảnh')}
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

            <label className="flex items-center gap-3 cursor-pointer select-none px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
              <input 
                type="checkbox" 
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className={`w-4 h-4 rounded border-gray-600 bg-gray-700`}
              />
              <span className="text-xs font-bold text-gray-300">Gửi ẩn danh</span>
            </label>
          </div>
          
          {/* Image Preview */}
          {image && (
            <div className="relative w-full h-40 bg-black/20 rounded-xl overflow-hidden border border-white/10">
                <img src={image} alt="Preview" className="w-full h-full object-contain" />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCompressing || isGenerating}
            className={`w-full bg-gradient-to-r ${theme.buttonGradient} text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send size={20} strokeWidth={2.5} />
            <span className="tracking-wide">GỬI LỜI CHÚC</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageForm;