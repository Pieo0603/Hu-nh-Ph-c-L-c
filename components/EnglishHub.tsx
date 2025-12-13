import React, { useState, useEffect } from 'react';
import { BookOpen, Star, ChevronRight, Lock, Unlock, Loader2, ArrowLeft } from 'lucide-react';
import { db } from '../services/firebase';
import { AppUser, ThemeConfig, VocabItem, Topic } from '../types';

interface EnglishHubProps {
  user: AppUser | null;
  theme: ThemeConfig;
}

const TOPICS: Topic[] = Array.from({ length: 17 }, (_, i) => ({
    id: `topic_${i + 1}`,
    title: `Unit ${i + 1}`,
    description: `Chủ đề bài học số ${i + 1}`,
    icon: '📚'
}));

const EnglishHub: React.FC<EnglishHubProps> = ({ user, theme }) => {
    const [mode, setMode] = useState<'menu' | 'topic' | 'unlock'>('menu');
    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    const [vocabList, setVocabList] = useState<VocabItem[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Unlock Logic State
    const [inputCode, setInputCode] = useState('');
    const [checkingCode, setCheckingCode] = useState(false);
    const [unlocked, setUnlocked] = useState(false);

    // Check user premium status
    useEffect(() => {
        if (user?.isPremium) setUnlocked(true);
    }, [user]);

    const handleUnlock = async () => {
        if (!user) {
            alert("Vui lòng đăng nhập trước!");
            return;
        }
        setCheckingCode(true);
        try {
            const doc = await db.collection("settings").doc("global_config").get();
            const serverCode = doc.data()?.accessCode;
            
            if (inputCode === serverCode) {
                // Update user status
                await db.collection("users").doc(user.uid).update({ isPremium: true });
                setUnlocked(true);
                setMode('menu');
                alert("Kích hoạt thành công! Bạn đã mở khóa toàn bộ nội dung.");
            } else {
                alert("Mã truy cập không đúng.");
            }
        } catch (error) {
            console.error("Lỗi kiểm tra mã:", error);
            alert("Có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setCheckingCode(false);
        }
    };

    const handleSelectTopic = (topic: Topic) => {
        const unitNumber = parseInt(topic.id.split('_')[1]);
        if (unitNumber > 2 && !unlocked) {
            setMode('unlock');
            return;
        }
        setActiveTopic(topic);
        setMode('topic');
        fetchVocab(topic.id);
    };

    const fetchVocab = async (topicId: string) => {
        setLoading(true);
        try {
            const snapshot = await db.collection("vocabulary").where("topicId", "==", topicId).get();
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabItem));
            setVocabList(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Icon component helper
    const UnlockIcon = () => <Unlock size={20} />;

    return (
        <div className="max-w-4xl mx-auto px-4 pb-20 animate-in fade-in duration-300">
            {/* Header */}
            <div className="text-center mb-10 mt-10">
                <h2 className={`text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientTitle} uppercase tracking-wider mb-2`}>
                    English Hub
                </h2>
                <p className="text-gray-400">Từ vựng SGK Tiếng Anh 12 - Global Success</p>
            </div>

            {mode === 'menu' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TOPICS.map((topic) => {
                        const unitNum = parseInt(topic.id.split('_')[1]);
                        const isLocked = unitNum > 2 && !unlocked;

                        return (
                            <div 
                                key={topic.id}
                                onClick={() => handleSelectTopic(topic)}
                                className={`group relative overflow-hidden rounded-2xl border ${isLocked ? 'border-gray-700 bg-[#1a1a2e]/50 opacity-80' : 'border-white/10 bg-[#1a1a2e] hover:border-pink-500/50'} p-5 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-2xl">
                                        {topic.icon}
                                    </div>
                                    {isLocked && <Lock size={16} className="text-gray-500" />}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">{topic.title}</h3>
                                <p className="text-xs text-gray-500">{topic.description}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {mode === 'topic' && activeTopic && (
                <div>
                    <button onClick={() => setMode('menu')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
                        <ArrowLeft size={20} /> Quay lại
                    </button>
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-2xl font-bold text-white mb-4">{activeTopic.title} <span className="text-pink-400">Vocabulary</span></h3>
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-pink-500" size={32} /></div>
                        ) : vocabList.length === 0 ? (
                            <p className="text-gray-500 italic">Chưa có từ vựng nào trong chủ đề này.</p>
                        ) : (
                            <div className="space-y-3">
                                {vocabList.map(vocab => (
                                    <div key={vocab.id} className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <div>
                                            <p className="text-lg font-bold text-white flex items-center gap-2">
                                                {vocab.word} 
                                                <span className="text-xs font-normal text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">{vocab.type}</span>
                                            </p>
                                            <p className="text-gray-400 text-sm">{vocab.pronunciation}</p>
                                        </div>
                                        <div className="text-right md:text-right">
                                            <p className="text-yellow-400 font-medium">{vocab.meaning}</p>
                                            {vocab.example && <p className="text-xs text-gray-600 italic">"{vocab.example}"</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {mode === 'unlock' && (
                <div className="max-w-md mx-auto bg-[#1a1a2e] border border-pink-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-600"></div>
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-500/30">
                            <Lock size={32} className="text-pink-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Mở khóa Nội dung</h3>
                        <p className="text-sm text-gray-400">Nhập mã truy cập để mở khóa các Unit tiếp theo.</p>
                    </div>

                    <input 
                        type="text" 
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        placeholder="NHẬP MÃ (VD: KHOA-HOC-VIP)"
                        className="w-full bg-black/40 border border-gray-600 text-center text-xl font-mono text-white rounded-xl py-4 mb-6 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none tracking-widest uppercase placeholder-gray-600"
                    />

                    {/* Unlock Action Buttons */}
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
                  
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <p className="text-[10px] text-gray-500 mb-3 uppercase tracking-widest font-bold">Chưa có mã? Liên hệ Admin</p>
                      <div className="flex flex-col gap-3">
                          <a 
                            href="https://www.facebook.com/HplIt6030" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center justify-center gap-2 text-xs font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 px-4 py-2.5 rounded-xl border border-blue-500/20 transition-all group"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                              Facebook: Huỳnh Phước Lộc
                          </a>
                          <div 
                            className="flex items-center justify-center gap-2 text-xs font-bold text-green-400 hover:text-white bg-green-500/10 hover:bg-green-600 px-4 py-2.5 rounded-xl border border-green-500/20 transition-all cursor-pointer group" 
                            onClick={() => {navigator.clipboard.writeText('0795545909'); alert('Đã sao chép số Zalo!');}}
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-white"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                              Zalo: 0795545909 (Sao chép)
                          </div>
                      </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnglishHub;