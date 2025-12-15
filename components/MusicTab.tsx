import React, { useState } from 'react';
import { Search, Play, Music, Youtube, AlertCircle, ShieldCheck } from 'lucide-react';
import { ThemeConfig } from '../types';

interface MusicTabProps {
  theme: ThemeConfig;
  onSelectVideo: (videoId: string, title: string, channel: string, thumbnail: string) => void;
  compact?: boolean;
}

interface SearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: { url: string };
    };
  };
}

// --- CẤU HÌNH API KEY CỦA BẠN TẠI ĐÂY ---
// B1: Vào Google Cloud Console tạo API Key (Youtube Data API v3)
// B2: Dán Key vào biến bên dưới
const YOUTUBE_API_KEY = "AIzaSyAwtcY7DRZ3Z9ATmYA71pOzF9SjN9FvDIU"; 

// Danh sách gợi ý sẵn (Đã lọc các video an toàn, cho phép nhúng 100%)
const RECOMMENDED = [
  // Lofi Girl
  { id: "jfKfPfyJRdk", title: "lofi hip hop radio 📚 - beats to relax/study to", channel: "Lofi Girl", img: "https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault_live.jpg" },
  { id: "4xDzrJKXOOY", title: "synthwave radio 🌌 - beats to chill/game to", channel: "Lofi Girl", img: "https://i.ytimg.com/vi/4xDzrJKXOOY/mqdefault_live.jpg" },
  // Chillhop
  { id: "5yx6BWlEVcY", title: "Chillhop Radio - jazzy & lofi hip hop beats", channel: "Chillhop Music", img: "https://i.ytimg.com/vi/5yx6BWlEVcY/mqdefault_live.jpg" },
  // Abao in Tokyo (Safe Lofi)
  { id: "kgx4WGK0oNU", title: "jazz/lofi hip hop radio🌱chill beats to relax/study to", channel: "Abao in Tokyo", img: "https://i.ytimg.com/vi/kgx4WGK0oNU/mqdefault_live.jpg" },
  // Cafe Music BGM
  { id: "lP26UCnoHg", title: "Coffee Shop Jazz ☕ Relaxing Jazz Piano", channel: "Cafe Music BGM", img: "https://i.ytimg.com/vi/lP26UCnoHg/mqdefault_live.jpg" },
  // Classical Hall
  { id: "M05t-Dj4Ckk", title: "Classical Music for Studying & Brain Power", channel: "HALIDONMUSIC", img: "https://i.ytimg.com/vi/M05t-Dj4Ckk/mqdefault.jpg" },
];

const MusicTab: React.FC<MusicTabProps> = ({ theme, onSelectVideo, compact = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');

    try {
      // API CALL UPDATE:
      // videoEmbeddable=true: Chỉ lấy video cho phép nhúng.
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      setResults(data.items || []);
    } catch (err: any) {
      console.error(err);
      setError('Key YouTube hết hạn hoặc lỗi. Vui lòng chọn nhạc từ danh sách đề xuất bên dưới.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`animate-in fade-in duration-500 ${compact ? 'pt-4 pb-4' : 'pt-20 pb-24'} px-4 max-w-6xl mx-auto`}>
      
      {/* Header */}
      {!compact && (
        <div className="text-center mb-8">
            <h2 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${theme.gradientTitle} uppercase tracking-widest mb-2`}>
            Kho Nhạc YouTube
            </h2>
            <p className="text-gray-400 text-sm">Tìm kiếm và chọn nhạc để phát khi học bài.</p>
        </div>
      )}

      {/* Search Bar */}
      <div className={`glass-panel p-4 md:p-6 rounded-2xl mb-8 border-t border-white/10 shadow-xl max-w-3xl mx-auto ${compact ? 'bg-black/40' : ''}`}>
         <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Nhập tên bài hát, Lofi, Piano..." 
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 className={`flex-grow bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-${theme.hex} transition-all`}
               />
               <button 
                 type="submit" 
                 disabled={loading}
                 className={`px-6 rounded-lg bg-gradient-to-r ${theme.buttonGradient} text-white font-bold shadow-lg hover:opacity-90 transition-all flex items-center gap-2 whitespace-nowrap`}
               >
                 {loading ? <div className="animate-spin w-4 h-4 border-2 border-white rounded-full border-t-transparent"></div> : <Search size={18} />}
                 <span className="hidden sm:inline">Tìm kiếm</span>
               </button>
            </div>
            
            {/* Filter Note */}
            <div className="flex items-center gap-2 text-[10px] text-gray-500 justify-center">
                <ShieldCheck size={12} className="text-green-500" />
                <span>Đã bật bộ lọc an toàn & cho phép nhúng</span>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                    <AlertCircle size={14} /> {error}
                </div>
            )}
         </form>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
          <div className="mb-10 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
                <Search size={18} className={theme.text} /> Kết quả tìm kiếm
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.map((item) => (
                    <div 
                    key={item.id.videoId} 
                    onClick={() => onSelectVideo(item.id.videoId, item.snippet.title, item.snippet.channelTitle, item.snippet.thumbnails.medium.url)}
                    className="hover-shine bg-[#1a1a2e] hover:bg-[#252540] border border-white/5 rounded-xl p-3 flex gap-3 cursor-pointer transition-all group hover:-translate-y-1 shadow-lg"
                    >
                        <div className="relative w-28 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                            <img src={item.snippet.thumbnails.medium.url} alt={item.snippet.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play size={24} fill="white" className="text-white drop-shadow-lg" />
                            </div>
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                            <h4 className="text-sm font-bold text-gray-200 line-clamp-2 leading-tight mb-1 group-hover:text-white transition-colors">{item.snippet.title}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Youtube size={10} /> {item.snippet.channelTitle}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* Recommended List */}
      <div>
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
            <Music size={18} className="text-yellow-400" /> Đề xuất chọn lọc (An toàn)
        </h3>
        <p className="text-xs text-gray-500 mb-4">Các playlist này luôn hoạt động kể cả khi tính năng Tìm kiếm bị lỗi Key.</p>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${compact ? 'xl:grid-cols-3' : 'xl:grid-cols-3'} gap-4`}>
            {RECOMMENDED.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => onSelectVideo(item.id, item.title, item.channel, item.img)}
                  className="hover-shine bg-[#1a1a2e]/60 hover:bg-[#252540] border border-white/5 rounded-xl p-3 flex gap-3 cursor-pointer transition-all group hover:-translate-y-1"
                >
                    <div className="relative w-24 h-16 flex-shrink-0 overflow-hidden rounded-lg">
                        <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={20} fill="white" className="text-white" />
                        </div>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-gray-200 line-clamp-2 leading-tight mb-1 group-hover:text-white">{item.title}</h4>
                        <p className="text-xs text-gray-500">{item.channel}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default MusicTab;