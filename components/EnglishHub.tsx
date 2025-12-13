import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ThemeConfig, VocabItem, AppUser } from '../types';
import { BookOpen, Volume2, ArrowLeft, ChevronRight, Loader2, Lock, Star, Key, RotateCw, Crown } from 'lucide-react';

interface EnglishHubProps {
  theme: ThemeConfig;
  user: AppUser | null;
  onBack?: () => void;
}

type Mode = 'menu' | 'flashcard' | 'code';

const TOPICS = Array.from({ length: 17 }, (_, i) => ({
    id: `topic_${i + 1}`,
    title: `Unit ${i + 1}`,
    description: `Từ vựng SGK Tiếng Anh 12 - Unit ${i + 1}`,
    isFree: i < 2 
}));

const EnglishHub: React.FC<EnglishHubProps> = ({ theme, user, onBack }) => {
  const [mode, setMode] = useState<Mode>('menu');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Flashcard vars
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Code vars
  const [inputCode, setInputCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    if (activeTopic) {
        setLoading(true);
        db.collection("vocabulary")
          .where("topicId", "==", activeTopic)
          .get()
          .then(snapshot => {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabItem));
              setVocabList(data);
              setCurrentIndex(0);
              setIsFlipped(false);
          })
          .catch(err => console.error(err))
          .finally(() => setLoading(false));
    }
  }, [activeTopic]);

  const handleSelectTopic = (topic: typeof TOPICS[0]) => {
      if (!topic.isFree && !user?.isPremium) {
          // Không dùng confirm nữa, chuyển thẳng sang màn hình nhập code để trải nghiệm mượt hơn
          setMode('code');
          return;
      }
      setActiveTopic(topic.id);
      setMode('flashcard');
  };

  const handleUnlock = async () => {
      if (!user) {
          alert("Vui lòng đăng nhập trước.");
          return;
      }
      if (!inputCode.trim()) {
          alert("Vui lòng nhập mã.");
          return;
      }

      setCheckingCode(true);
      try {
          const configDoc = await db.collection("settings").doc("global_config").get();
          // Lấy mã từ DB, nếu chưa set thì mặc định là ADMIN123 để test
          const serverCode = configDoc.exists ? configDoc.data()?.accessCode : "ADMIN123";
          
          if (serverCode && inputCode.trim().toUpperCase() === serverCode) {
              await db.collection("users").doc(user.uid).set({ isPremium: true }, { merge: true });
              alert("Mở khóa thành công! Bạn đã là thành viên VIP.");
              setMode('menu');
          } else {
              alert("Mã không đúng. Vui lòng thử lại.");
          }
      } catch (e) {
          console.error(e);
          alert("Lỗi kiểm tra mã. Vui lòng kiểm tra kết nối mạng.");
      } finally {
          setCheckingCode(false);
      }
  };

  const speak = (text: string) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
  };

  // Views
  if (mode === 'code') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 px-4">
              <div className="bg-[#1e1e2e] p-8 rounded-3xl border border-white/10 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                  {/* Decor background */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                  
                  <div className="w-20 h-20 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/10">
                      <Key className="text-pink-400" size={40} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">Mở khóa VIP</h3>
                  <p className="text-gray-400 text-sm mb-8">
                      Nhập mã truy cập đặc biệt để mở khóa toàn bộ nội dung bài học.
                  </p>
                  
                  <div className="relative mb-6">
                      <input 
                        type="text" 
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="w-full bg-black/40 border border-gray-600 rounded-xl px-4 py-4 text-white text-center font-mono text-xl focus:border-pink-500 outline-none uppercase placeholder-gray-700 tracking-widest"
                        placeholder="NHẬP MÃ TẠI ĐÂY"
                        autoFocus
                      />
                  </div>
                  
                  <div className="flex gap-3">
                      <button onClick={() => setMode('menu')} className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-white/5 font-bold transition-all">
                          Để sau
                      </button>
                      <button 
                        onClick={handleUnlock} 
                        disabled={!inputCode || checkingCode} 
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          {checkingCode ? <Loader2 className="animate-spin" size={20} /> : <UnlockIcon />}
                          <span>Kích hoạt</span>
                      </button>
                  </div>
                  
                  <p className="text-[10px] text-gray-600 mt-6">
                      * Liên hệ Admin nếu bạn chưa có mã.
                  </p>
              </div>
          </div>
      )
  }

  if (mode === 'flashcard') {
      return (
          <div className="max-w-4xl mx-auto py-6 animate-in fade-in duration-300">
               <div className="flex items-center justify-between mb-8 px-4">
                  <button onClick={() => setMode('menu')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold">
                      <ArrowLeft size={20} /> Danh sách bài học
                  </button>
                  <span className="text-sm font-bold text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                      {vocabList.length > 0 ? `${currentIndex + 1}/${vocabList.length}` : '0/0'}
                  </span>
               </div>

               {loading ? (
                   <div className="flex justify-center py-32"><Loader2 className="animate-spin text-indigo-400" size={48} /></div>
               ) : vocabList.length === 0 ? (
                   <div className="text-center py-20 text-gray-400">Chưa có từ vựng nào trong chủ đề này.</div>
               ) : (
                   <div className="px-4">
                       <div className="relative w-full aspect-[4/3] md:aspect-[2/1] perspective cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                           <div className={`w-full h-full relative preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
                               {/* Front */}
                               <div className="absolute inset-0 backface-hidden bg-[#1e1e2e] border-2 border-indigo-500/30 rounded-3xl flex flex-col items-center justify-center p-6 shadow-2xl hover:border-indigo-500/60 transition-colors">
                                    <span className="absolute top-6 right-6 text-xs font-bold text-indigo-400 border border-indigo-400/30 px-2 py-1 rounded uppercase tracking-wider">{vocabList[currentIndex].type}</span>
                                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 text-center">{vocabList[currentIndex].word}</h2>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); speak(vocabList[currentIndex].word); }}
                                        className="flex items-center gap-2 text-gray-400 bg-black/20 hover:bg-black/40 px-4 py-2 rounded-full transition-colors"
                                    >
                                        <Volume2 size={20} />
                                        <span className="font-mono text-lg">{vocabList[currentIndex].pronunciation}</span>
                                    </button>
                                    <p className="absolute bottom-6 text-xs text-gray-600 uppercase tracking-widest font-bold opacity-50">Chạm để xem nghĩa</p>
                               </div>

                               {/* Back */}
                               <div className="absolute inset-0 backface-hidden bg-[#1a1a2e] border-2 border-purple-500/30 rounded-3xl flex flex-col items-center justify-center p-6 shadow-2xl rotate-y-180">
                                    <h3 className="text-2xl md:text-4xl font-bold text-purple-300 mb-4 text-center">{vocabList[currentIndex].meaning}</h3>
                                    <div className="space-y-2 text-center">
                                        {vocabList[currentIndex].synonyms && <p className="text-sm text-gray-400"><strong>Đồng nghĩa:</strong> {vocabList[currentIndex].synonyms}</p>}
                                        {vocabList[currentIndex].antonyms && <p className="text-sm text-gray-400"><strong>Trái nghĩa:</strong> {vocabList[currentIndex].antonyms}</p>}
                                    </div>
                               </div>
                           </div>
                       </div>

                       <div className="flex items-center justify-center gap-6 mt-10">
                            <button 
                                onClick={() => { setCurrentIndex(prev => (prev - 1 + vocabList.length) % vocabList.length); setIsFlipped(false); }}
                                className="w-14 h-14 rounded-full bg-[#1e1e2e] border border-gray-700 text-white hover:bg-gray-800 transition-all flex items-center justify-center"
                            >
                                <ChevronRight className="rotate-180" />
                            </button>
                            
                            <button 
                                onClick={() => { setIsFlipped(!isFlipped); }}
                                className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 transition-all flex items-center justify-center"
                            >
                                <RotateCw size={24} />
                            </button>

                            <button 
                                onClick={() => { setCurrentIndex(prev => (prev + 1) % vocabList.length); setIsFlipped(false); }}
                                className="w-14 h-14 rounded-full bg-[#1e1e2e] border border-gray-700 text-white hover:bg-gray-800 transition-all flex items-center justify-center"
                            >
                                <ChevronRight />
                            </button>
                       </div>
                   </div>
               )}
          </div>
      )
  }

  // Menu Mode
  return (
      <div className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-4">
                  <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                      <ArrowLeft size={20} className="text-white" />
                  </button>
                  <div>
                      <h2 className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientTitle}`}>Từ Vựng SGK</h2>
                      <p className="text-sm text-gray-400">Tiếng Anh 12 (Unit 1-16)</p>
                  </div>
              </div>
              
              {/* Nút nhập mã hiển thị ở góc phải header */}
              {!user?.isPremium && (
                  <button 
                    onClick={() => setMode('code')}
                    className="flex flex-col items-center justify-center gap-1 bg-[#1e1e2e] hover:bg-[#2a2a3e] border border-pink-500/30 p-2 rounded-xl transition-all hover:scale-105 shadow-lg group"
                    title="Nhập mã VIP"
                  >
                      <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20">
                          <Key size={16} className="text-pink-400" />
                      </div>
                      <span className="text-[10px] font-bold text-pink-400">Nhập Mã</span>
                  </button>
              )}
              {user?.isPremium && (
                  <div className="flex flex-col items-center gap-1 opacity-80">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30">
                          <Crown size={16} className="text-yellow-400" />
                      </div>
                      <span className="text-[10px] font-bold text-yellow-500">VIP</span>
                  </div>
              )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
              {TOPICS.map((topic, index) => {
                  const isLocked = !topic.isFree && !user?.isPremium;
                  return (
                      <div 
                        key={topic.id}
                        onClick={() => handleSelectTopic(topic)}
                        className={`group relative p-6 rounded-2xl border transition-all cursor-pointer overflow-hidden ${isLocked ? 'bg-[#151520] border-gray-800 opacity-80 hover:opacity-100' : 'bg-[#1e1e2e] border-gray-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10'}`}
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${isLocked ? 'bg-gray-800' : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'}`}>
                                  {isLocked ? <Lock size={20} className="text-gray-500" /> : <BookOpen size={20} className="text-indigo-400" />}
                              </div>
                              {topic.isFree && <span className="text-[10px] font-bold bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/20">MIỄN PHÍ</span>}
                          </div>
                          <h3 className={`text-lg font-bold mb-1 ${isLocked ? 'text-gray-500' : 'text-white'}`}>{topic.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{topic.description}</p>
                          
                          {/* Progress Bar Placeholder */}
                          {!isLocked && (
                             <div className="mt-4 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-500 w-0 group-hover:w-full transition-all duration-700"></div>
                             </div>
                          )}
                      </div>
                  )
              })}
          </div>

          {!user?.isPremium && (
             <div className="mt-8 mx-2 p-6 rounded-2xl bg-gradient-to-r from-pink-900/40 to-purple-900/40 border border-pink-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse-slow">
                         <Star className="text-pink-400" fill="currentColor" size={24} />
                     </div>
                     <div>
                         <h3 className="text-lg font-bold text-white">Mở khóa toàn bộ nội dung</h3>
                         <p className="text-sm text-gray-400">Truy cập không giới hạn tất cả các Unit và tính năng nâng cao.</p>
                     </div>
                 </div>
                 <button onClick={() => setMode('code')} className="whitespace-nowrap px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold shadow-lg transition-transform hover:scale-105">
                     Nhập mã kích hoạt
                 </button>
             </div>
          )}
      </div>
  );
};

// Helper Icon
const UnlockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
)

export default EnglishHub;