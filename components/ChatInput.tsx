import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { ThemeConfig } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string, image?: string) => void;
  isLoading: boolean;
  theme: ThemeConfig;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, theme }) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize logic (Simple & Safe)
  useEffect(() => {
    if (textareaRef.current) {
        // Reset height to auto to get correct scrollHeight
        textareaRef.current.style.height = 'auto';
        // Set new height capped at 120px
        const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
        textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.size > 5 * 1024 * 1024) {
          alert("Ảnh lớn quá (Max 5MB)!");
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image'));
      if (item) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
              reader.readAsDataURL(file);
          }
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if ((!input.trim() && !selectedImage) || isLoading) return;
      
      onSendMessage(input, selectedImage || undefined);
      
      // Reset
      setInput('');
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="p-3 bg-[#121212]/50 backdrop-blur-md">
        {/* Image Preview Bar */}
        {selectedImage && (
            <div className="flex items-center justify-between bg-[#1f1f1f] p-2 rounded-lg mb-2 border border-white/10 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                    <img src={selectedImage} alt="Preview" className="w-10 h-10 rounded object-cover border border-white/20" />
                    <span className="text-xs text-green-400 font-bold">Đã chọn ảnh</span>
                </div>
                <button 
                    onClick={() => setSelectedImage(null)} 
                    className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
                >
                    <X size={16} />
                </button>
            </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
            />
            
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-3 mb-[2px] rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/5 flex-shrink-0"
                title="Gửi ảnh"
            >
                <ImageIcon size={20} />
            </button>

            <div className="flex-grow relative">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder={selectedImage ? "Thêm ghi chú..." : "Hỏi bài tập..."}
                    rows={1}
                    className="w-full bg-black/40 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors resize-none max-h-[120px] overflow-y-auto"
                    style={{ minHeight: '46px' }}
                />
            </div>
            
            <button 
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={`p-3 mb-[2px] rounded-xl flex-shrink-0 transition-all shadow-lg flex items-center justify-center ${
                    (!input.trim() && !selectedImage) || isLoading
                    ? 'text-gray-600 bg-white/5 cursor-not-allowed' 
                    : `text-white bg-gradient-to-br ${theme.buttonGradient} hover:scale-105 active:scale-95`
                }`}
            >
                <Send size={18} />
            </button>
        </form>
    </div>
  );
};

export default ChatInput;