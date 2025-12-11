import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { ThemeConfig, VocabItem, Topic, AppUser } from '../types';
import { BookOpen, HelpCircle, Volume2, RotateCw, Check, X, ArrowLeft, BrainCircuit, Code, Save, ChevronRight, Trophy, Meh, Smile, Loader2, Lock, BarChart3, Clock, Flame, PieChart, AlertTriangle } from 'lucide-react';

interface EnglishHubProps {
  theme: ThemeConfig;
  user: AppUser | null;
  onBack?: () => void; // New prop to handle navigation back to Subject Menu
}

type Mode = 'menu' | 'flashcard' | 'quiz' | 'listening' | 'code' | 'stats';

interface UserTopicProgress {
    topicId: string;
    memorized: string[]; // List of word IDs
    learning: string[];  // List of word IDs
    quizScores: { score: number, timestamp: number }[];
    studySeconds: number;
    lastStudied: number;
}

// --- SOUND ASSETS ---
// Sử dụng CDN mp3 ngắn gọn, nhẹ
const SOUNDS = {
    flip: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3', // ĐỔI: Tiếng lật thẻ mới (Card Slide/Flick)
    correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Tiếng Ping đúng
    wrong: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3', // Tiếng Bleep sai
    win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' // Tiếng thắng lớn
};

const playSound = (type: keyof typeof SOUNDS) => {
    try {
        const audio = new Audio(SOUNDS[type]);
        audio.volume = 0.5; // Giảm âm lượng một chút
        audio.play().catch(e => console.log("Audio play blocked", e));
    } catch (e) {
        console.error("Audio error", e);
    }
};

const EnglishHub: React.FC<EnglishHubProps> = ({ theme, user, onBack }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Stats Data
  const [userProgress, setUserProgress] = useState<Record<string, UserTopicProgress>>({});
  const [totalVocabCount, setTotalVocabCount] = useState(0);

  // Load Topics from Firebase or Default
  useEffect(() => {
    const defaultTopics: Topic[] = Array.from({ length: 17 }, (_, i) => ({
      id: `topic_${i + 1}`,
      title: `Chủ đề ${i + 1}`,
      description: `Từ vựng chuyên đề ${i + 1}`,
      icon: '📚'
    }));
    setTopics(defaultTopics);
  }, []);

  // Load User Progress (Realtime)
  useEffect(() => {
    if (user) {
        const unsubscribe = db.collection("user_learning_progress")
            .where("userId", "==", user.uid)
            .onSnapshot((snapshot) => {
            const progressMap: Record<string, UserTopicProgress> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Doc ID format: userId_topicId. We need to parse or store topicId in doc
                const topicId = data.topicId;
                if (topicId) {
                    progressMap[topicId] = data as UserTopicProgress;
                }
            });
            setUserProgress(progressMap);
        });
        return () => unsubscribe();
    } else {
        setUserProgress({});
    }
  }, [user]);

  // Fetch Vocab when Topic selected
  useEffect(() => {
    if (selectedTopic) {
      setLoading(true);
      db.collection("vocabulary").where("topicId", "==", selectedTopic.id).get()
      .then((snapshot) => {
        const words = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabItem));
        if (words.length > 0) {
            setVocabList(words);
        } else {
            // Fake data for demo if empty
            const demoWords: VocabItem[] = [
                { id: '1', topicId: selectedTopic.id, word: 'break a promise', type: 'phrase', pronunciation: '/breɪk ə ˈprɒmɪs/', meaning: 'không giữ lời hứa, thất hứa', level: 'B1', synonyms: '', antonyms: 'keep a promise' },
                { id: '2', topicId: selectedTopic.id, word: 'geographer', type: 'n', pronunciation: '/dʒiˈɒɡrəfə(r)/', meaning: 'nhà địa lý', level: 'B2', synonyms: '', antonyms: '' },
                { id: '3', topicId: selectedTopic.id, word: 'normally', type: 'adv', pronunciation: '/ˈnɔːməli/', meaning: 'thông thường', level: 'B2', synonyms: 'usually', antonyms: 'abnormally' },
                { id: '4', topicId: selectedTopic.id, word: 'daylight', type: 'n', pronunciation: '/ˈdeɪlaɪt/', meaning: 'ánh sáng ban ngày', level: 'B2', synonyms: 'sunlight', antonyms: 'darkness' },
            ];
            setVocabList(demoWords);
        }
        setLoading(false);
      });
    }
  }, [selectedTopic]);

  // Time Tracking Logic
  useEffect(() => {
      let interval: any;
      if (user && selectedTopic && mode !== 'menu' && mode !== 'stats') {
          interval = setInterval(async () => {
              // Time tracking logic placeholder
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [user, selectedTopic, mode]);

  const handleSelectTopic = (topic: Topic) => {
    if (!user) {
        alert("Vui lòng đăng nhập (Góc trái) để truy cập bài học và lưu tiến độ!");
        return;
    }
    setSelectedTopic(topic);
    setMode('flashcard'); // Default mode
  };

  const handleBackToMenu = () => {
    setSelectedTopic(null);
    setMode('menu');
  };

  const saveProgress = async (topicId: string, type: 'flashcard' | 'quiz' | 'time', data: any) => {
      if (!user) return;
      const docId = `${user.uid}_${topicId}`;
      const docRef = db.collection("user_learning_progress").doc(docId);
      
      try {
          const docSnap = await docRef.get();
          let currentData = docSnap.exists ? docSnap.data() as UserTopicProgress : {
              topicId, userId: user.uid, memorized: [], learning: [], quizScores: [], studySeconds: 0, lastStudied: Date.now()
          };

          if (type === 'flashcard') {
              const { wordId, status } = data;
              currentData.memorized = currentData.memorized?.filter(id => id !== wordId) || [];
              currentData.learning = currentData.learning?.filter(id => id !== wordId) || [];
              
              if (status === 'memorized') currentData.memorized.push(wordId);
              else currentData.learning.push(wordId);
          } else if (type === 'quiz') {
              const { score } = data;
              currentData.quizScores = [...(currentData.quizScores || []), { score, timestamp: Date.now() }];
          } else if (type === 'time') {
              const { seconds } = data;
              currentData.studySeconds = (currentData.studySeconds || 0) + seconds;
          }

          currentData.lastStudied = Date.now();
          await docRef.set(currentData, { merge: true });
      } catch (e) {
          console.error("Error saving progress:", e);
      }
  };

  return (
    <div className="w-full mx-auto animate-in fade-in duration-500">
      
      {/* HEADER: TITLE & BACK BUTTON */}
      {selectedTopic ? (
          <div className="flex items-center gap-4 mb-6">
              <button onClick={handleBackToMenu} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <ArrowLeft size={20} />
              </button>
              <div>
                  <h2 className="text-xl font-bold text-white">{selectedTopic.title}</h2>
                  <p className="text-xs text-gray-400">{selectedTopic.description}</p>
              </div>
          </div>
      ) : (
          /* Main Menu Header with Stats Button */
          <div className="flex justify-between items-end mb-6">
              <div className="flex items-center gap-3">
                  {onBack && (
                     <button 
                        onClick={onBack}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/5"
                     >
                        <ArrowLeft size={20} className="text-white" />
                     </button>
                  )}
                  <div>
                    <h2 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${theme.gradientTitle} uppercase tracking-widest`}>Học Tiếng Anh</h2>
                    <p className="text-gray-400 text-sm mt-1">Luyện từ vựng & Code mỗi ngày</p>
                  </div>
              </div>
              {user && (
                  <button 
                    onClick={() => setMode(mode === 'stats' ? 'menu' : 'stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'stats' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                      {mode === 'stats' ? <><ArrowLeft size={16} /> Quay lại</> : <><BarChart3 size={16} /> Thống kê</>}
                  </button>
              )}
          </div>
      )}

      {/* 1. TOPIC LIST (MENU) */}
      {!selectedTopic && mode === 'menu' && (
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {topics.map(topic => {
                const isLocked = !user;
                // Get progress for this topic
                const prog = userProgress[topic.id];
                const learnedCount = (prog?.memorized?.length || 0) + (prog?.learning?.length || 0);
                // Simulate total count (or pass it if known). Assume ~20 words per topic for demo UI
                const totalEstimated = 20; 
                const percent = Math.min(100, Math.round((learnedCount / totalEstimated) * 100));

                return (
                    <div 
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className={`relative hover-shine glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer group hover:-translate-y-1 transition-all border border-white/5 hover:border-white/20 overflow-hidden ${isLocked ? 'opacity-70' : ''}`}
                    >
                        {isLocked && (
                            <div className="absolute top-2 right-2 bg-black/40 p-1.5 rounded-full z-10">
                                <Lock size={14} className="text-gray-400" />
                            </div>
                        )}
                        <span className="text-4xl group-hover:scale-110 transition-transform">{topic.icon}</span>
                        <h3 className="font-bold text-white text-center">{topic.title}</h3>
                        
                        {/* Progress Bar (Only if user exists) */}
                        {user && (
                            <div className="w-full mt-2">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                    <span>Đã học {learnedCount} từ</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full bg-gradient-to-r ${theme.buttonGradient}`} style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        )}
                        {!user && <p className="text-[10px] text-gray-500 text-center line-clamp-2">{topic.description}</p>}
                    </div>
                );
            })}
         </div>
      )}

      {/* 2. STATS DASHBOARD */}
      {!selectedTopic && mode === 'stats' && user && (
          <UserStatsView progress={userProgress} theme={theme} />
      )}

      {/* 3. LEARNING MODES */}
      {selectedTopic && loading && (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white" size={40} /></div>
      )}

      {selectedTopic && !loading && vocabList.length === 0 && mode !== 'code' && (
           <div className="text-center py-20 bg-white/5 rounded-2xl">
               <p className="text-gray-400">Chưa có từ vựng nào trong chủ đề này.</p>
               <p className="text-xs text-gray-500 mt-2">Vào Admin &gt; Upload Data để thêm từ.</p>
           </div>
      )}

      {selectedTopic && !loading && vocabList.length > 0 && mode === 'flashcard' && (
          <FlashcardView vocabList={vocabList} theme={theme} onSaveProgress={(wordId, status) => saveProgress(selectedTopic.id, 'flashcard', { wordId, status })} onSaveTime={(seconds) => saveProgress(selectedTopic.id, 'time', { seconds })} />
      )}

      {selectedTopic && !loading && vocabList.length > 0 && mode === 'quiz' && (
          <QuizView vocabList={vocabList} theme={theme} onSaveScore={(score) => saveProgress(selectedTopic.id, 'quiz', { score })} onSaveTime={(seconds) => saveProgress(selectedTopic.id, 'time', { seconds })} />
      )}

      {selectedTopic && !loading && vocabList.length > 0 && mode === 'listening' && (
          <ListeningView vocabList={vocabList} theme={theme} />
      )}

      {selectedTopic && mode === 'code' && (
          <CodeSnippetView topicId={selectedTopic.id} theme={theme} />
      )}

      {/* BOTTOM NAVIGATION BAR (FIXED) */}
      {selectedTopic && (
          <div className="fixed bottom-4 left-4 right-4 z-40 bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex justify-between md:justify-center gap-1 md:gap-4 overflow-x-auto no-scrollbar">
              <button onClick={() => setMode('flashcard')} className={`flex-1 md:flex-none flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${mode === 'flashcard' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                  <BookOpen size={20} className={mode === 'flashcard' ? 'text-yellow-400' : ''} />
                  <span className="text-[10px] font-bold mt-1">Học từ</span>
              </button>
              <button onClick={() => setMode('quiz')} className={`flex-1 md:flex-none flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${mode === 'quiz' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                  <HelpCircle size={20} className={mode === 'quiz' ? 'text-green-400' : ''} />
                  <span className="text-[10px] font-bold mt-1">Trắc nghiệm</span>
              </button>
              <button onClick={() => setMode('listening')} className={`flex-1 md:flex-none flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${mode === 'listening' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                  <Volume2 size={20} className={mode === 'listening' ? 'text-blue-400' : ''} />
                  <span className="text-[10px] font-bold mt-1">Nghe</span>
              </button>
              <button onClick={() => setMode('code')} className={`flex-1 md:flex-none flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${mode === 'code' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                  <Code size={20} className={mode === 'code' ? 'text-pink-400' : ''} />
                  <span className="text-[10px] font-bold mt-1">Code</span>
              </button>
          </div>
      )}
    </div>
  );
};

// --- SUB COMPONENTS ---

// 1. USER STATS VIEW
const UserStatsView: React.FC<{ progress: Record<string, UserTopicProgress>, theme: ThemeConfig }> = ({ progress, theme }) => {
    // 1. Calculate Aggregates
    const allProgress = Object.values(progress) as UserTopicProgress[];
    
    // Vocab Stats
    let totalMemorized = 0;
    let totalLearning = 0;
    allProgress.forEach(p => {
        totalMemorized += (p.memorized?.length || 0);
        totalLearning += (p.learning?.length || 0);
    });
    const totalLearned = totalMemorized + totalLearning;

    // Time Stats (Seconds -> Mins/Hours)
    const totalSeconds = allProgress.reduce((acc, curr) => acc + (curr.studySeconds || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);
    
    // Streak Logic
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const hasStudiedToday = allProgress.some(p => p.lastStudied >= startOfToday);
    
    // Quiz Stats
    let totalScore = 0;
    let totalQuizzes = 0;
    let worstTopic = { id: '', score: 100 };
    
    allProgress.forEach(p => {
        if (p.quizScores && p.quizScores.length > 0) {
            const topicAvg = p.quizScores.reduce((a, b) => a + b.score, 0) / p.quizScores.length;
            totalScore += p.quizScores.reduce((a, b) => a + b.score, 0);
            totalQuizzes += p.quizScores.length;
            if (topicAvg < worstTopic.score) {
                worstTopic = { id: p.topicId, score: topicAvg };
            }
        }
    });
    const avgScore = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* Top Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1e1e2e] p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2">
                        <Flame size={14} className="text-orange-500" /> Streak
                    </div>
                    <div className="text-2xl font-bold text-white">{hasStudiedToday ? "1" : "0"} <span className="text-xs font-normal text-gray-500">ngày</span></div>
                    <p className="text-[10px] text-gray-500 mt-1">{hasStudiedToday ? "Đã học hôm nay ✅" : "Chưa học hôm nay ❌"}</p>
                </div>
                <div className="bg-[#1e1e2e] p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2">
                        <BookOpen size={14} className="text-blue-500" /> Từ đã thuộc
                    </div>
                    <div className="text-2xl font-bold text-white">{totalMemorized} <span className="text-xs font-normal text-gray-500">từ</span></div>
                    <p className="text-[10px] text-gray-500 mt-1">Trên tổng {totalLearned} từ đã học</p>
                </div>
                <div className="bg-[#1e1e2e] p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2">
                        <Clock size={14} className="text-green-500" /> Tổng giờ
                    </div>
                    <div className="text-2xl font-bold text-white">{totalHours} <span className="text-xs font-normal text-gray-500">giờ</span></div>
                    <p className="text-[10px] text-gray-500 mt-1">Tích lũy toàn thời gian</p>
                </div>
                <div className="bg-[#1e1e2e] p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2">
                        <Trophy size={14} className="text-yellow-500" /> Điểm TB
                    </div>
                    <div className="text-2xl font-bold text-white">{avgScore} <span className="text-xs font-normal text-gray-500">điểm</span></div>
                    <p className="text-[10px] text-gray-500 mt-1">{totalQuizzes} bài kiểm tra</p>
                </div>
            </div>

            {/* SRS / Vocab Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1e1e2e] p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><PieChart size={18} /> Phân tích Từ vựng (Mochi Style)</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Đã nhớ (Memorized)</span>
                                <span>{totalMemorized}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${totalLearned ? (totalMemorized/totalLearned)*100 : 0}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Đang học (Learning)</span>
                                <span>{totalLearning}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full">
                                <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${totalLearned ? (totalLearning/totalLearned)*100 : 0}%` }}></div>
                            </div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg mt-4">
                            <p className="text-xs text-yellow-400 font-bold mb-1">SRS Queue (Cần ôn tập):</p>
                            <p className="text-2xl font-bold text-white">{totalLearning} <span className="text-sm font-normal text-gray-500">từ</span></p>
                            <p className="text-[10px] text-gray-500">Các từ trạng thái "Learning" cần được ôn lại ngay.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1e1e2e] p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle size={18} /> Phân tích Điểm yếu</h3>
                    
                    {worstTopic.id ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-xs text-red-400 font-bold uppercase mb-1">Chủ đề yếu nhất</p>
                                <p className="text-lg font-bold text-white">
                                    {worstTopic.id.replace('topic_', 'Chủ đề ')}
                                </p>
                                <p className="text-xs text-gray-400">Điểm trung bình: {Math.round(worstTopic.score)}</p>
                            </div>
                            <div className="text-xs text-gray-400">
                                <p className="mb-2">Gợi ý cải thiện:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Dành thêm 15 phút ôn tập chủ đề này.</li>
                                    <li>Làm lại bài trắc nghiệm để cải thiện điểm số.</li>
                                    <li>Sử dụng chế độ "Nghe & Điền" để tăng phản xạ.</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Smile size={32} className="mx-auto mb-2 text-green-500" />
                            <p>Chưa có dữ liệu điểm yếu. Hãy làm bài kiểm tra!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 2. FLASHCARD (Updated with Auto-Pronounce & Save Logic & Timer)
const FlashcardView: React.FC<{ 
    vocabList: VocabItem[], 
    theme: ThemeConfig, 
    onSaveProgress: (wordId: string, status: 'memorized' | 'learning') => void,
    onSaveTime: (seconds: number) => void
}> = ({ vocabList, theme, onSaveProgress, onSaveTime }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Timer tracking
    useEffect(() => {
        const interval = setInterval(() => {
            onSaveTime(1);
        }, 1000);
        return () => clearInterval(interval);
    }, [onSaveTime]);

    const currentWord = vocabList[currentIndex];

    // AUTO PRONOUNCE LOGIC
    useEffect(() => {
        if (currentWord) {
            // Delay slightly to let the card transition complete or flip happen
            const timer = setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(currentWord.word);
                utterance.lang = 'en-US';
                utterance.rate = 0.8;
                // Only speak if not flipped (looking at English word) or just switched
                if (!isFlipped) {
                    window.speechSynthesis.speak(utterance);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, currentWord, isFlipped]);

    // CSS Styles for 3D Effect
    const containerStyle: React.CSSProperties = {
        perspective: '1000px',
    };
    
    const cardStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        transition: 'transform 0.6s',
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    };

    const faceStyle: React.CSSProperties = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden', // Safari support
        borderRadius: '1.5rem',
        boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
    };

    const backFaceStyle: React.CSSProperties = {
        ...faceStyle,
        transform: 'rotateY(180deg)',
    };

    const handleFlip = () => {
        playSound('flip');
        setIsFlipped(!isFlipped);
    };

    const handleGrade = (status: 'memorized' | 'learning') => {
        // Save to Firebase
        onSaveProgress(currentWord.id, status);

        // Sound Effect
        if (status === 'memorized') playSound('correct');
        else playSound('wrong');

        setIsFlipped(false);
        setTimeout(() => {
             setCurrentIndex((prev) => (prev + 1) % vocabList.length);
        }, 300);
    };

    const speak = (e: React.MouseEvent) => {
        e.stopPropagation(); // QUAN TRỌNG: Ngăn lật thẻ khi bấm loa
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = 'en-US'; // Đọc tiếng Anh
        utterance.rate = 0.8; 
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="flex flex-col items-center w-full max-w-sm md:max-w-md mx-auto">
            <div className="w-full text-center mb-4 text-sm text-gray-400 font-medium tracking-widest uppercase">
                Thẻ {currentIndex + 1} / {vocabList.length}
            </div>
            
            <div className="w-full h-56 md:h-96 mb-6 cursor-pointer group select-none" style={containerStyle} onClick={handleFlip}>
                <div style={cardStyle}>
                    
                    {/* FRONT SIDE */}
                    <div style={faceStyle} className="bg-white flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
                        
                        {/* Type Indicator */}
                        <div className="absolute top-4 left-6 md:top-8 md:left-8 flex flex-col items-start gap-1">
                             <div className="w-8 h-1.5 bg-gray-200 rounded-full"></div>
                             <span className="text-gray-400 text-xs font-bold uppercase tracking-wide mt-1">
                                {currentWord.type}
                             </span>
                        </div>
                        
                        {/* Audio Button */}
                        <button 
                            onClick={speak} 
                            className="absolute top-4 right-6 md:top-8 md:right-8 w-10 h-10 md:w-12 md:h-12 bg-yellow-400 hover:bg-yellow-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-20 active:scale-95"
                            title="Nghe phát âm"
                        >
                            <Volume2 size={20} fill="currentColor" strokeWidth={2.5} />
                        </button>
                        
                        <div className="flex flex-col items-center justify-center h-full text-center mt-2 w-full">
                            {/* Từ vựng chính - Giảm size chữ */}
                            <h3 className="text-3xl md:text-5xl font-extrabold text-[#1a1a2e] mb-2 leading-tight tracking-tight break-words max-w-full">
                                {currentWord.word}
                            </h3>
                            
                            {/* Phiên âm */}
                            {currentWord.pronunciation && (
                                <p className="text-base md:text-lg text-gray-500 font-medium font-serif bg-gray-100 px-4 py-1 rounded-full">
                                    {currentWord.pronunciation}
                                </p>
                            )}
                        </div>
                        
                        {/* Footer hint */}
                        <div className="mt-auto flex flex-col items-center gap-2">
                             <div className="w-8 h-1.5 bg-gray-100 rounded-full"></div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Chạm để xem nghĩa</p>
                        </div>
                    </div>

                    {/* BACK SIDE */}
                    <div style={backFaceStyle} className="bg-white flex flex-col items-center justify-center p-4 md:p-8 border-4 border-indigo-50">
                         <div className="flex flex-col items-center justify-center h-full text-center w-full">
                            <h3 className="text-xl md:text-3xl font-bold text-gray-800 mb-4 leading-relaxed line-clamp-3">
                                {currentWord.meaning}
                            </h3>
                            
                            <div className="w-full bg-gray-50 p-3 md:p-5 rounded-2xl text-left space-y-2 md:space-y-3 shadow-inner">
                                 <div className="flex items-center gap-3 text-sm text-gray-700 border-b border-gray-200 pb-2">
                                     <span className="font-bold text-indigo-500 min-w-[60px]">Cấp độ:</span> 
                                     <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{currentWord.level}</span>
                                 </div>
                                 {currentWord.synonyms && (
                                     <div className="flex items-start gap-3 text-xs md:text-sm text-gray-700">
                                         <span className="font-bold text-green-600 min-w-[60px]">ĐN:</span> 
                                         <span className="italic line-clamp-1">{currentWord.synonyms}</span>
                                     </div>
                                 )}
                                 {currentWord.antonyms && (
                                     <div className="flex items-start gap-3 text-xs md:text-sm text-gray-700">
                                         <span className="font-bold text-red-500 min-w-[60px]">TN:</span> 
                                         <span className="italic line-clamp-1">{currentWord.antonyms}</span>
                                     </div>
                                 )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROL BUTTONS */}
            <div className="grid grid-cols-2 gap-4 w-full px-2">
                <button 
                    onClick={() => handleGrade('learning')}
                    className="flex flex-col items-center justify-center gap-1 py-3 md:py-4 rounded-2xl bg-[#1e1e2e] border border-red-500/30 hover:bg-red-500/10 text-red-400 font-bold transition-all active:scale-95 hover:border-red-500"
                >
                    <Meh size={24} />
                    <span>Chưa nhớ</span>
                </button>
                <button 
                    onClick={() => handleGrade('memorized')}
                    className="flex flex-col items-center justify-center gap-1 py-3 md:py-4 rounded-2xl bg-[#1e1e2e] border border-green-500/30 hover:bg-green-500/10 text-green-400 font-bold transition-all active:scale-95 shadow-lg shadow-green-900/20 hover:border-green-500"
                >
                    <Smile size={24} />
                    <span>Đã nhớ</span>
                </button>
            </div>
        </div>
    );
};

// 2. QUIZ (Redesigned for Mobile)
const QuizView: React.FC<{ 
    vocabList: VocabItem[], 
    theme: ThemeConfig,
    onSaveScore: (score: number) => void,
    onSaveTime: (seconds: number) => void
}> = ({ vocabList, theme, onSaveScore, onSaveTime }) => {
    const [qIndex, setQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [options, setOptions] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);

    // Timer
    useEffect(() => {
        const interval = setInterval(() => {
            onSaveTime(1);
        }, 1000);
        return () => clearInterval(interval);
    }, [onSaveTime]);

    const question = vocabList[qIndex];

    useEffect(() => {
        if (!question) return;
        const otherMeanings = vocabList
            .filter(v => v.id !== question.id)
            .map(v => v.meaning)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
        
        const allOptions = [...otherMeanings, question.meaning].sort(() => 0.5 - Math.random());
        setOptions(allOptions);
        setSelected(null);
    }, [qIndex, question, vocabList]);

    const handleAnswer = (ans: string) => {
        if (selected) return;
        setSelected(ans);
        
        if (ans === question.meaning) {
            playSound('correct');
            setScore(s => s + 10);
            setTimeout(() => {
                nextQuestion();
            }, 1000);
        } else {
            playSound('wrong');
        }
    };

    const nextQuestion = () => {
        if (qIndex < vocabList.length - 1) {
            setQIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
            playSound('win'); // Thắng lớn
            // Save final score
            onSaveScore(score);
        }
    };

    const speak = () => {
        const u = new SpeechSynthesisUtterance(question.word);
        u.lang='en-US'; 
        window.speechSynthesis.speak(u);
    }

    if (isFinished) {
        return (
            <div className="text-center py-10 animate-in fade-in zoom-in duration-300">
                <div className="inline-block p-6 rounded-full bg-yellow-500/20 mb-6 animate-bounce">
                    <Trophy size={64} className="text-yellow-400" />
                </div>
                <h2 className="text-4xl font-black text-white mb-2">Hoàn thành!</h2>
                <p className="text-gray-400 mb-8 text-lg">Bạn đạt được <span className="text-yellow-400 font-bold">{score}</span> điểm.</p>
                <button onClick={() => { setQIndex(0); setScore(0); setIsFinished(false); }} className={`w-full max-w-xs px-8 py-4 rounded-full bg-gradient-to-r ${theme.buttonGradient} font-bold text-white shadow-xl text-lg hover:scale-105 transition-transform`}>
                    Làm lại
                </button>
            </div>
        );
    }

    // Progress Bar Calculation
    const progressPercent = ((qIndex + 1) / vocabList.length) * 100;

    return (
        <div className="max-w-md mx-auto flex flex-col h-full">
            {/* Top Bar: Progress & Score */}
            <div className="flex flex-col gap-2 mb-2">
                 {/* Progress Bar */}
                 <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                     <div className={`h-full bg-gradient-to-r ${theme.buttonGradient} transition-all duration-500`} style={{width: `${progressPercent}%`}}></div>
                 </div>
                 <div className="flex justify-between items-center text-xs font-bold uppercase">
                     <span className="text-gray-500">Câu {qIndex + 1}/{vocabList.length}</span>
                     <span className="text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">Điểm: {score}</span>
                 </div>
            </div>

            {/* Question Section - THAY ĐỔI: Giảm padding và size chữ */}
            <div className="flex-grow flex flex-col items-center justify-center py-2 mb-4 relative">
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 bg-white/5 px-3 py-1 rounded-full">Chọn nghĩa đúng</p>
                 
                 <div className="text-center relative z-10">
                    <h3 className="text-2xl md:text-5xl font-black text-white mb-1 drop-shadow-xl">{question.word}</h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-gray-400 font-serif text-sm md:text-lg bg-black/30 px-3 py-1 rounded-lg">{question.pronunciation}</span>
                        <button onClick={speak} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 text-gray-300 transition-colors">
                            <Volume2 size={16} />
                        </button>
                    </div>
                 </div>
                 
                 {/* Background decoration */}
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent blur-3xl -z-0"></div>
            </div>

            {/* Options Grid - THAY ĐỔI: Giảm gap và padding nút */}
            <div className="flex flex-col gap-2 pb-12">
                {options.map((opt, i) => {
                    let btnClass = "bg-[#1e1e2e] border-[#333] hover:bg-[#2a2a3e] active:scale-[0.98]";
                    let icon = null;

                    if (selected) {
                        if (opt === question.meaning) {
                            btnClass = "bg-green-500 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]";
                            icon = <Check size={18} className="text-white" />;
                        }
                        else if (opt === selected) {
                            btnClass = "bg-red-500 border-red-400 text-white opacity-90";
                            icon = <X size={18} className="text-white" />;
                        }
                        else btnClass = "opacity-40 bg-black border-transparent";
                    } else {
                        btnClass += " text-gray-200 border-2";
                    }

                    return (
                        <button 
                            key={i}
                            onClick={() => handleAnswer(opt)}
                            disabled={!!selected}
                            className={`
                                relative p-3 md:p-5 rounded-xl text-left font-bold text-sm md:text-lg transition-all duration-200 
                                flex items-center justify-between group shadow-lg
                                ${btnClass}
                            `}
                        >
                            <span className="line-clamp-2">{opt}</span>
                            {icon}
                        </button>
                    );
                })}
            </div>
             
            {selected && selected !== question.meaning && (
                 <button onClick={nextQuestion} className={`w-full py-4 rounded-2xl bg-white text-black font-extrabold shadow-xl hover:bg-gray-200 transition-transform active:scale-95 animate-in slide-in-from-bottom-4 mb-4`}>
                     Câu tiếp theo <ChevronRight size={20} className="inline ml-1" />
                 </button>
            )}
        </div>
    );
};

// 3. LISTENING (Updated)
const ListeningView: React.FC<{ vocabList: VocabItem[], theme: ThemeConfig }> = ({ vocabList, theme }) => {
    const [index, setIndex] = useState(0);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

    const currentWord = vocabList[index];

    const playAudio = () => {
        const u = new SpeechSynthesisUtterance(currentWord.word);
        u.lang = 'en-US';
        u.rate = 0.8;
        window.speechSynthesis.speak(u);
    };

    useEffect(() => {
        setInput('');
        setStatus('idle');
        const timer = setTimeout(playAudio, 500);
        return () => clearTimeout(timer);
    }, [index]);

    const checkAnswer = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.toLowerCase().trim() === currentWord.word.toLowerCase()) {
            setStatus('correct');
            playSound('correct');
            setTimeout(() => {
                 setIndex((i) => (i + 1) % vocabList.length);
            }, 1500);
        } else {
            setStatus('wrong');
            playSound('wrong');
        }
    };

    return (
        <div className="max-w-md mx-auto text-center">
             <div className="w-full text-right mb-2 text-sm text-gray-400">
                {index + 1} / {vocabList.length}
            </div>
             <div className="glass-panel p-8 rounded-3xl mb-8 flex flex-col items-center border-2 border-white/10">
                 <button onClick={playAudio} className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 text-white flex items-center justify-center mb-6 transition-transform hover:scale-110 active:scale-95">
                     <Volume2 size={40} />
                 </button>
                 <p className="text-gray-400 text-sm font-medium">Nghe và điền từ vào chỗ trống</p>
                 
                 {status === 'correct' && (
                    <div className="mt-4 animate-in zoom-in duration-300">
                        <p className="text-green-400 font-black text-3xl">{currentWord.word}</p>
                        <p className="text-green-500/70 text-sm font-bold mt-1">Chính xác! Đang chuyển...</p>
                    </div>
                 )}
                 {status === 'wrong' && (
                    <div className="mt-4 animate-in shake duration-300">
                         <p className="text-red-400 font-bold text-lg">Sai rồi, thử lại nhé!</p>
                    </div>
                 )}
             </div>

             <form onSubmit={checkAnswer} className="relative">
                 <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={status === 'correct'}
                    placeholder="Nhập từ bạn nghe được..."
                    autoFocus
                    className={`w-full bg-black/30 border-2 rounded-2xl px-4 py-4 text-center text-xl font-bold focus:outline-none transition-all placeholder:text-gray-600 placeholder:font-normal ${status === 'correct' ? 'border-green-500 text-green-400' : status === 'wrong' ? 'border-red-500 text-red-400' : 'border-gray-700 focus:border-indigo-500 text-white'}`}
                 />
                 <button type="submit" className="absolute right-3 top-3 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                     <Check size={20} className="text-gray-300" />
                 </button>
             </form>

             {status !== 'correct' && (
                 <button onClick={() => { setStatus('wrong'); setInput(currentWord.word); }} className="mt-8 text-xs text-gray-500 hover:text-white underline">
                     Không nghe được? Xem đáp án
                 </button>
             )}
             
             {status === 'wrong' && (
                 <button onClick={() => setIndex((i) => (i + 1) % vocabList.length)} className="block mx-auto mt-4 px-6 py-2 bg-white/10 rounded-full text-sm font-bold hover:bg-white/20">
                     Câu tiếp theo
                 </button>
             )}
        </div>
    );
};

// 4. CODE SNIPPET (Giữ nguyên)
const CodeSnippetView: React.FC<{ topicId: string, theme: ThemeConfig }> = ({ topicId, theme }) => {
    const [code, setCode] = useState('');
    const [title, setTitle] = useState('');
    const [snippets, setSnippets] = useState<{id: string, title: string, code: string}[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem(`snippets_${topicId}`);
        if (saved) setSnippets(JSON.parse(saved));
    }, [topicId]);

    const saveSnippet = () => {
        if (!code.trim() || !title.trim()) return;
        const newSnippet = { id: Date.now().toString(), title, code };
        const updated = [newSnippet, ...snippets];
        setSnippets(updated);
        localStorage.setItem(`snippets_${topicId}`, JSON.stringify(updated));
        setCode('');
        setTitle('');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Code size={20} /> Thêm Code Mới</h3>
                <input 
                    className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-2 mb-2 text-white text-sm" 
                    placeholder="Tên đoạn code (VD: HTML cơ bản)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <textarea 
                    className="w-full h-64 bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 text-green-400 font-mono text-xs focus:outline-none resize-none"
                    placeholder="// Dán code của bạn vào đây..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                <button onClick={saveSnippet} className={`w-full mt-2 py-2 rounded-lg bg-gradient-to-r ${theme.buttonGradient} text-white font-bold flex items-center justify-center gap-2`}>
                    <Save size={16} /> Lưu Code
                </button>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="font-bold text-white mb-4">Danh sách đã lưu</h3>
                {snippets.map(s => (
                    <div key={s.id} className="bg-[#1e1e1e] rounded-xl border border-gray-800 mb-4 overflow-hidden">
                        <div className="bg-gray-800 px-4 py-2 text-xs font-bold text-gray-300 border-b border-gray-700">
                            {s.title}
                        </div>
                        <pre className="p-4 text-xs text-blue-300 overflow-x-auto">
                            <code>{s.code}</code>
                        </pre>
                    </div>
                ))}
                {snippets.length === 0 && <p className="text-gray-500 text-sm">Chưa có đoạn code nào.</p>}
            </div>
        </div>
    );
};

export default EnglishHub;