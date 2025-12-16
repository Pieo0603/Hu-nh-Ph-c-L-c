import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { ThemeConfig, VocabItem, Topic, AppUser } from '../types';
import { BookOpen, HelpCircle, Volume2, Check, ArrowLeft, Code, Trophy, BarChart3, Clock, PieChart, Loader2, Lock, Unlock, BrainCircuit, List, RotateCcw, Coffee, CheckCircle2, XCircle } from 'lucide-react';

interface EnglishHubProps {
  theme: ThemeConfig;
  user: AppUser | null;
  onBack?: () => void;
}

type Mode = 'menu' | 'flashcard' | 'quiz' | 'listening' | 'code' | 'stats' | 'unlock' | 'list';

// --- SRS DATA STRUCTURE ---
interface VocabProgress {
    box: number;        // Leitner Box (0-5)
    nextReview: number; // Timestamp
    lastReview: number; // Timestamp
    streak: number;     // Số lần đúng liên tiếp
}

interface UserTopicProgress {
    topicId: string;
    // Thay vì mảng đơn giản, dùng Map để lưu chi tiết SRS
    vocabState: Record<string, VocabProgress>; 
    quizScores: { score: number, timestamp: number }[];
    studySeconds: number;
    lastStudied: number;
}

// --- SOUND ASSETS ---
const SOUNDS = {
    flip: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
    correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
    win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    relax: 'https://assets.mixkit.co/active_storage/sfx/112/112-preview.mp3'
};

const playSound = (type: keyof typeof SOUNDS) => {
    try {
        const audio = new Audio(SOUNDS[type]);
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch (e) {
        console.error("Audio error", e);
    }
};

// --- TTS HELPER ---
const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name === 'Google US English') || 
                           voices.find(v => v.name === 'Samantha') || 
                           voices.find(v => v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
};

// --- SRS ALGORITHM (LEITNER SYSTEM - MODIFIED FOR SHORT TERM PHASE) ---
const calculateInterval = (box: number): number => {
    const MIN = 60 * 1000;
    const DAY = 24 * 60 * 60 * 1000;
    
    switch (box) {
        case 0: return 0;          // Again: Học lại ngay
        case 1: return 10 * MIN;   // Hard: Ôn lại sau 10 phút
        case 2: return 1 * DAY;    // Good: 1 ngày
        case 3: return 3 * DAY;    // Easy: 3 ngày
        case 4: return 7 * DAY;    // Strong: 1 tuần
        case 5: return 21 * DAY;   // Mastered: 3 tuần
        default: return 30 * DAY;
    }
};

const getButtonLabel = (box: number) => {
    if (box === 0) return "1 phút";
    if (box === 1) return "10 phút";
    if (box === 2) return "1 ngày";
    if (box === 3) return "3 ngày";
    if (box >= 4) return "1 tuần+";
    return "Lâu dài";
};

const EnglishHub: React.FC<EnglishHubProps> = ({ theme, user, onBack }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Unlock Logic
  const [inputCode, setInputCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  
  // Stats Data
  const [userProgress, setUserProgress] = useState<Record<string, UserTopicProgress>>({});

  // Load Topics
  useEffect(() => {
    const defaultTopics: Topic[] = [
      { id: 'topic_1',  title: 'Vocab Topic: Viet Nam’s National Day', description: 'Từ vựng về Quốc khánh Việt Nam', icon: '🇻🇳' },
      { id: 'topic_2',  title: 'Vocab Topic: Environmental Protection', description: 'Bảo vệ môi trường', icon: '🌱' },
      { id: 'topic_3',  title: 'Vocab Topic: Health', description: 'Sức khỏe', icon: '🩺' },
      { id: 'topic_4',  title: 'Vocab Topic: Natural Disasters', description: 'Thiên tai', icon: '🌪️' },
      { id: 'topic_5',  title: 'Vocab Topic: Fame', description: 'Danh tiếng', icon: '⭐' },
      { id: 'topic_6',  title: 'Vocab Topic: Health (2)', description: 'Sức khỏe (mở rộng)', icon: '💊' },
      { id: 'topic_7',  title: 'Vocab Topic: The Environment', description: 'Môi trường', icon: '🌍' },
      { id: 'topic_8',  title: 'Vocab Topic: Weather And Climate', description: 'Thời tiết và khí hậu', icon: '⛅' },
      { id: 'topic_9',  title: 'Vocab Topic: AI And Traffic', description: 'AI và giao thông', icon: '🤖' },
      { id: 'topic_10', title: 'Vocab Topic: Extreme Weather', description: 'Thời tiết cực đoan', icon: '🔥' },
      { id: 'topic_11', title: 'Vocab Topic: Health (3)', description: 'Sức khỏe nâng cao', icon: '🏥' },
      { id: 'topic_12', title: 'Vocab Topic: Net-Zero', description: 'Phát thải ròng bằng 0', icon: '♻️' },
      { id: 'topic_13', title: 'Vocab Topic: Natural Disasters (2)', description: 'Thiên tai (nâng cao)', icon: '🌊' },
      { id: 'topic_14', title: 'Vocab Topic: Social Issues', description: 'Vấn đề xã hội', icon: '👥' },
      { id: 'topic_15', title: 'Vocab Topic: Climate Change', description: 'Biến đổi khí hậu', icon: '🌡️' },
      { id: 'topic_16', title: 'Vocab Topic: Work', description: 'Công việc', icon: '💼' },
      { id: 'topic_17', title: 'Vocab Topic: Flight Emissions', description: 'Khí thải hàng không', icon: '✈️' },
    ];
    setTopics(defaultTopics);
  }, []);

  // Load User Progress
  useEffect(() => {
    if (user) {
        const unsubscribe = db.collection("user_learning_progress")
            .where("userId", "==", user.uid)
            .onSnapshot((snapshot) => {
            const progressMap: Record<string, UserTopicProgress> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const topicId = data.topicId;
                if (topicId) {
                    // Migration logic
                    if (!data.vocabState && (data.memorized || data.learning)) {
                        const vocabState: Record<string, VocabProgress> = {};
                        (data.memorized || []).forEach((id: string) => vocabState[id] = { box: 5, nextReview: Date.now() + 30*24*60*60*1000, lastReview: Date.now(), streak: 5 });
                        (data.learning || []).forEach((id: string) => vocabState[id] = { box: 1, nextReview: Date.now(), lastReview: Date.now(), streak: 0 });
                        data.vocabState = vocabState;
                    }
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

  // Fetch Vocab
  useEffect(() => {
    if (selectedTopic && mode !== 'unlock') {
      setLoading(true);
      db.collection("vocabulary").where("topicId", "==", selectedTopic.id).get()
      .then((snapshot) => {
        const words = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabItem));
        setVocabList(words.length > 0 ? words : []);
        setLoading(false);
      });
    }
  }, [selectedTopic, mode]);

  const handleSelectTopic = (topic: Topic) => {
    if (!user) {
        alert("Vui lòng đăng nhập (Góc trái) để lưu tiến độ Spaced Repetition!");
        return;
    }
    const topicNumber = parseInt(topic.id.split('_')[1]);
    const isLocked = topicNumber > 3 && !user.isPremium;

    if (isLocked) {
        setMode('unlock');
        return;
    }
    setSelectedTopic(topic);
    setMode('flashcard');
  };

  const handleBackToMenu = () => {
    setSelectedTopic(null);
    setMode('menu');
  };

  const handleUnlock = async () => {
      if (!user) return;
      setCheckingCode(true);
      try {
          const doc = await db.collection("settings").doc("global_config").get();
          const serverCode = doc.data()?.accessCode;
          
          if (inputCode.trim().toUpperCase() === serverCode) {
              await db.collection("users").doc(user.uid).update({ isPremium: true });
              alert("Kích hoạt VIP thành công! Bạn đã mở khóa toàn bộ nội dung.");
              setMode('menu'); 
          } else {
              alert("Mã truy cập không đúng.");
          }
      } catch (error) {
          console.error(error);
          alert("Có lỗi xảy ra. Vui lòng thử lại.");
      } finally {
          setCheckingCode(false);
      }
  };

  const saveProgress = async (topicId: string, type: 'flashcard' | 'quiz' | 'time' | 'reset', data: any) => {
      if (!user) return;
      const docId = `${user.uid}_${topicId}`;
      const docRef = db.collection("user_learning_progress").doc(docId);
      
      try {
          const docSnap = await docRef.get();
          let currentData = docSnap.exists ? docSnap.data() as UserTopicProgress : {
              topicId, userId: user.uid, vocabState: {}, quizScores: [], studySeconds: 0, lastStudied: Date.now()
          };

          // Ensure vocabState is initialized
          if (!currentData.vocabState) {
              currentData.vocabState = {};
          }

          if (type === 'flashcard') {
              const { wordId, rating } = data; 
              const now = Date.now();
              const currentState = currentData.vocabState[wordId] || { box: 0, nextReview: 0, lastReview: 0, streak: 0 };
              
              let newBox = currentState.box;
              
              if (rating === 'again') {
                  newBox = 0; // Reset
              } else if (rating === 'good') {
                  newBox = Math.min(5, newBox + 1);
              } else if (rating === 'easy') {
                  // Jump but conservatively
                  newBox = Math.min(5, newBox + 2);
              }

              const interval = calculateInterval(newBox);
              const nextReview = now + interval;

              currentData.vocabState[wordId] = {
                  box: newBox,
                  nextReview: nextReview,
                  lastReview: now,
                  streak: rating === 'again' ? 0 : currentState.streak + 1
              };

          } else if (type === 'quiz') {
              const { score } = data;
              currentData.quizScores = [...(currentData.quizScores || []), { score, timestamp: Date.now() }];
          } else if (type === 'time') {
              const { seconds } = data;
              currentData.studySeconds = (currentData.studySeconds || 0) + seconds;
          } else if (type === 'reset') {
              const { wordId } = data;
              currentData.vocabState[wordId] = {
                  box: 0,
                  nextReview: Date.now(),
                  lastReview: Date.now(),
                  streak: 0
              };
          }

          currentData.lastStudied = Date.now();
          await docRef.set(currentData, { merge: true });
      } catch (e) {
          console.error("Error saving progress:", e);
      }
  };

  return (
    <div className="w-full mx-auto animate-in fade-in duration-500">
      
      {/* HEADER */}
      {selectedTopic && mode !== 'unlock' ? (
          <div className="flex items-center gap-4 mb-6">
              <button onClick={handleBackToMenu} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <ArrowLeft size={20} />
              </button>
              <div>
                  <h2 className="text-xl font-bold text-white">{selectedTopic.title}</h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                      <BrainCircuit size={12} className="text-pink-400" /> Spaced Repetition Active
                  </p>
              </div>
          </div>
      ) : (
          <div className="flex justify-between items-end mb-6">
              <div className="flex items-center gap-3">
                  {onBack && (
                     <button onClick={onBack} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/5">
                        <ArrowLeft size={20} className="text-white" />
                     </button>
                  )}
                  <div>
                    <h2 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${theme.gradientTitle} uppercase tracking-widest`}>Học Tiếng Anh</h2>
                    <p className="text-gray-400 text-sm mt-1">Phương pháp SRS (Lặp lại ngắt quãng)</p>
                  </div>
              </div>
              {user && mode !== 'unlock' && (
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
                const topicNumber = parseInt(topic.id.split('_')[1]);
                const isLocked = topicNumber > 3 && (!user || !user.isPremium);
                
                const prog = userProgress[topic.id];
                const vocabState = prog?.vocabState || {};
                const masteredCount = Object.values(vocabState).filter((v: any) => v.box >= 4).length;
                const estimatedTotal = 20;
                const percent = Math.min(100, Math.round((masteredCount / estimatedTotal) * 100));
                
                const now = Date.now();
                const reviewCount = Object.values(vocabState).filter((v: any) => v.nextReview <= now).length;

                return (
                    <div 
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className={`relative hover-shine glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer group hover:-translate-y-1 transition-all border ${isLocked ? 'border-gray-700 bg-gray-900/50' : 'border-white/5 hover:border-white/20'} overflow-hidden`}
                    >
                        {isLocked && (
                            <div className="absolute top-2 right-2 bg-black/60 p-2 rounded-full z-10 border border-gray-700">
                                <Lock size={16} className="text-gray-400" />
                            </div>
                        )}
                        {!isLocked && reviewCount > 0 && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-lg">
                                {reviewCount} cần ôn
                            </div>
                        )}
                        <span className={`text-4xl group-hover:scale-110 transition-transform ${isLocked ? 'opacity-30' : ''}`}>{topic.icon}</span>
                        <h3 className={`font-bold text-center ${isLocked ? 'text-gray-500' : 'text-white'}`}>{topic.title}</h3>
                        {user && !isLocked && (
                            <div className="w-full mt-2">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                    <span>Thành thạo: {masteredCount}</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full bg-gradient-to-r ${theme.buttonGradient}`} style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        )}
                        {isLocked && <p className="text-[10px] text-gray-600 text-center uppercase font-bold mt-2">Cần mã kích hoạt</p>}
                    </div>
                );
            })}
         </div>
      )}

      {/* 2. STATS */}
      {!selectedTopic && mode === 'stats' && user && (
          <UserStatsView progress={userProgress} />
      )}

      {/* 3. UNLOCK */}
      {mode === 'unlock' && (
          <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in-95 duration-300">
              <div className="bg-[#1e1e2e] p-8 rounded-3xl border border-pink-500/30 shadow-2xl max-w-md w-full relative overflow-hidden text-center">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-600"></div>
                  <div className="w-20 h-20 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-pink-500/30">
                      <Lock size={40} className="text-pink-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Mở khóa nội dung VIP</h2>
                  <p className="text-sm text-gray-400 mb-8">
                      Nhập mã truy cập để mở khóa các Unit tiếp theo (Từ Unit 4 trở đi).
                  </p>
                  <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} placeholder="NHẬP MÃ (VD: VIP-2026)" className="w-full bg-black/40 border border-gray-600 text-center text-xl font-mono text-white rounded-xl py-4 mb-6 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none tracking-widest uppercase placeholder-gray-700" />
                  <div className="flex gap-3">
                      <button onClick={() => setMode('menu')} className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-white/5 font-bold transition-all">Để sau</button>
                      <button onClick={handleUnlock} disabled={!inputCode || checkingCode} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">{checkingCode ? <Loader2 className="animate-spin" size={20} /> : <Unlock size={20} />}<span>Kích hoạt</span></button>
                  </div>
              </div>
          </div>
      )}

      {/* 4. LEARNING MODES */}
      {selectedTopic && mode !== 'unlock' && (
          <>
            {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white" size={40} /></div>}
            
            {!loading && vocabList.length === 0 && mode !== 'code' && (
                <div className="text-center py-20 bg-white/5 rounded-2xl"><p className="text-gray-400">Chưa có dữ liệu từ vựng.</p></div>
            )}

            {/* MAIN STUDY MODE: SRS FLASHCARD + INTEGRATED PRACTICE */}
            {!loading && vocabList.length > 0 && mode === 'flashcard' && (
                <SRSFlashcardView 
                    vocabList={vocabList} 
                    userProgress={userProgress[selectedTopic.id]} 
                    onSaveProgress={(wordId, rating) => saveProgress(selectedTopic.id, 'flashcard', { wordId, rating })} 
                    onSaveTime={(seconds) => saveProgress(selectedTopic.id, 'time', { seconds })} 
                />
            )}

            {!loading && vocabList.length > 0 && mode === 'quiz' && (
                <QuizView vocabList={vocabList} theme={theme} onSaveScore={(score) => saveProgress(selectedTopic.id, 'quiz', { score })} onSaveTime={(seconds) => saveProgress(selectedTopic.id, 'time', { seconds })} />
            )}

            {!loading && vocabList.length > 0 && mode === 'listening' && (
                <ListeningView vocabList={vocabList} />
            )}

            {mode === 'code' && <CodeSnippetView topicId={selectedTopic.id} theme={theme} />}

            {!loading && vocabList.length > 0 && mode === 'list' && (
                <VocabListView 
                    vocabList={vocabList} 
                    userProgress={userProgress[selectedTopic.id]} 
                    onResetWord={(wordId) => saveProgress(selectedTopic.id, 'reset', { wordId })}
                />
            )}

            <div className="fixed bottom-4 left-4 right-4 z-40 bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex justify-between gap-1 overflow-x-auto no-scrollbar">
                <button onClick={() => setMode('flashcard')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${mode === 'flashcard' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                    <BookOpen size={20} className={mode === 'flashcard' ? 'text-yellow-400' : ''} />
                    <span className="text-[10px] font-bold mt-1">Học SRS</span>
                </button>
                <button onClick={() => setMode('list')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${mode === 'list' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                    <List size={20} className={mode === 'list' ? 'text-indigo-400' : ''} />
                    <span className="text-[10px] font-bold mt-1">Danh sách</span>
                </button>
                <button onClick={() => setMode('quiz')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${mode === 'quiz' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                    <HelpCircle size={20} className={mode === 'quiz' ? 'text-green-400' : ''} />
                    <span className="text-[10px] font-bold mt-1">Trắc nghiệm</span>
                </button>
                <button onClick={() => setMode('listening')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${mode === 'listening' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                    <Volume2 size={20} className={mode === 'listening' ? 'text-blue-400' : ''} />
                    <span className="text-[10px] font-bold mt-1">Nghe</span>
                </button>
                <button onClick={() => setMode('code')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${mode === 'code' ? `bg-white/10 text-white` : 'text-gray-400 hover:text-white'}`}>
                    <Code size={20} className={mode === 'code' ? 'text-pink-400' : ''} />
                    <span className="text-[10px] font-bold mt-1">Code</span>
                </button>
            </div>
          </>
      )}
    </div>
  );
};

// --- UPDATED COMPONENT: SRS FLASHCARD VIEW WITH INTEGRATED PRACTICE ---
type StudyPhase = 'learning' | 'break' | 'practice';

const SRSFlashcardView: React.FC<{ 
    vocabList: VocabItem[], 
    userProgress: UserTopicProgress | undefined,
    // Removed unused theme prop
    onSaveProgress: (wordId: string, rating: 'again' | 'good' | 'easy') => void,
    onSaveTime: (seconds: number) => void
}> = ({ vocabList, userProgress, onSaveProgress, onSaveTime }) => {
    
    // 1. Queue Management
    const studyQueue = useMemo(() => {
        const now = Date.now();
        const vocabState = userProgress?.vocabState || {};
        const due = vocabList.filter(v => vocabState[v.id] && vocabState[v.id].nextReview <= now);
        const newWords = vocabList.filter(v => !vocabState[v.id]);
        return [...due, ...newWords];
    }, [vocabList, userProgress]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    
    // PHASE MANAGEMENT
    const [phase, setPhase] = useState<StudyPhase>('learning');
    
    // BATCH MANAGEMENT FOR PRACTICE
    // Stores items that need practice (Good/Easy ones from current session)
    const [practiceBatch, setPracticeBatch] = useState<{item: VocabItem, rating: 'good'|'easy'}[]>([]);
    const [practiceIndex, setPracticeIndex] = useState(0);
    const [practiceMode, setPracticeMode] = useState<'quiz' | 'listening'>('quiz');
    const [practiceScore, setPracticeScore] = useState(0);
    const [feedbackState, setFeedbackState] = useState<{show: boolean, isCorrect: boolean} | null>(null);
    
    // BREAK TIMER
    const [breakTimer, setBreakTimer] = useState(300);

    // Save time tracking
    useEffect(() => {
        const interval = setInterval(() => { onSaveTime(1); }, 1000);
        return () => clearInterval(interval);
    }, [onSaveTime]);

    // Timer logic for break
    useEffect(() => {
        let timer: any;
        if (phase === 'break' && breakTimer > 0) {
            timer = setInterval(() => setBreakTimer(t => t - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [phase, breakTimer]);

    // End condition
    useEffect(() => {
        if (studyQueue.length === 0 && phase === 'learning') setIsFinished(true);
    }, [studyQueue, phase]);

    // Current item for Flashcard
    const currentWord = studyQueue[currentIndex];
    
    // --- FLASHCARD LOGIC ---
    useEffect(() => {
        if (phase === 'learning' && currentWord && !isFlipped) {
            const timer = setTimeout(() => { speakText(currentWord.word); }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentWord, isFlipped, phase]);

    const handleFlip = () => {
        playSound('flip');
        setIsFlipped(!isFlipped);
    };

    const handleRate = (rating: 'again' | 'good' | 'easy') => {
        if (rating === 'again') {
            playSound('wrong');
            onSaveProgress(currentWord.id, rating);
            
            if (currentIndex < studyQueue.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setIsFinished(true);
            }
            setIsFlipped(false);
        } else {
            playSound('correct');
            const newBatch = [...practiceBatch, { item: currentWord, rating }];
            setPracticeBatch(newBatch);
            
            setIsFlipped(false);

            if (newBatch.length >= 10) {
                setPhase('break');
                setBreakTimer(300); // 5 mins
                playSound('relax');
            } else {
                if (currentIndex < studyQueue.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                } else {
                    if (newBatch.length > 0) {
                        setPhase('break'); 
                        setBreakTimer(10); 
                    } else {
                        setIsFinished(true);
                    }
                }
            }
        }
    };

    // --- PRACTICE LOGIC ---
    const startPractice = () => {
        setPhase('practice');
        setPracticeIndex(0);
        setPracticeScore(0); // Reset điểm
        setFeedbackState(null);
        setPracticeMode(Math.random() > 0.5 ? 'quiz' : 'listening');
    };

    const handlePracticeResult = (correct: boolean) => {
        // Prevent double clicks
        if (feedbackState) return;

        const currentPracticeItem = practiceBatch[practiceIndex];
        
        // 1. Show Feedback
        setFeedbackState({ show: true, isCorrect: correct });
        
        if (correct) {
            playSound('correct');
            setPracticeScore(s => s + 1); // Cộng điểm
            onSaveProgress(currentPracticeItem.item.id, currentPracticeItem.rating);
        } else {
            playSound('wrong');
            onSaveProgress(currentPracticeItem.item.id, 'again');
        }

        // 2. Delay before moving to next question (1.5s)
        setTimeout(() => {
            setFeedbackState(null); // Reset feedback
            
            if (practiceIndex < practiceBatch.length - 1) {
                setPracticeIndex(prev => prev + 1);
                setPracticeMode(Math.random() > 0.5 ? 'quiz' : 'listening');
            } else {
                // Batch Finished
                setPracticeBatch([]);
                setPhase('learning');
                setCurrentIndex(prev => prev + 1);
            }
        }, 1500);
    };

    // --- RENDERERS ---

    if (phase === 'break') {
        const mins = Math.floor(breakTimer / 60);
        const secs = breakTimer % 60;
        return (
            <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-500 bg-[#1e1e2e] rounded-3xl border border-white/5 mx-auto max-w-md shadow-2xl px-4">
                <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Coffee size={48} className="text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Giờ nghỉ giải lao!</h3>
                <p className="text-gray-400 text-sm mb-6 text-center">
                    Bạn đã học xong 10 từ. Hãy thư giãn một chút trước khi vào bài kiểm tra ngắn.
                </p>
                <div className="text-5xl font-mono font-bold text-white mb-8 tracking-widest">
                    {mins}:{secs < 10 ? `0${secs}` : secs}
                </div>
                <button onClick={startPractice} className="flex items-center gap-2 px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all shadow-lg active:scale-95">
                    <CheckCircle2 size={18} /> Vào bài kiểm tra
                </button>
            </div>
        );
    }

    if (phase === 'practice') {
        const item = practiceBatch[practiceIndex].item;
        return (
            <div className="flex flex-col items-center w-full max-w-md mx-auto animate-in zoom-in-95 duration-300">
                <div className="w-full flex justify-between items-end mb-6">
                    <div>
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">Practice Mode</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-white">{practiceScore}</span>
                            <span className="text-sm text-gray-500 font-bold">/ {practiceBatch.length} điểm</span>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 font-bold bg-white/5 px-2 py-1 rounded">
                        Câu {practiceIndex + 1}/{practiceBatch.length}
                    </span>
                </div>
                
                {practiceMode === 'quiz' ? (
                    <MiniQuizCard 
                        word={item} 
                        allWords={vocabList} 
                        onResult={handlePracticeResult} 
                        feedbackState={feedbackState}
                    />
                ) : (
                    <MiniListeningCard 
                        word={item} 
                        onResult={handlePracticeResult} 
                        feedbackState={feedbackState}
                    />
                )}
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <Check size={48} className="text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Đã hoàn thành!</h3>
                <p className="text-gray-400 mb-6">Bạn đã học hết các từ cần ôn hôm nay.</p>
            </div>
        );
    }

    if (!currentWord) return null;

    // Flashcard Render (Legacy Logic)
    const currentBox = userProgress?.vocabState?.[currentWord?.id]?.box || 0;
    const intervalAgain = getButtonLabel(0);
    const intervalGood = getButtonLabel(Math.min(5, currentBox + 1));
    const intervalEasy = getButtonLabel(Math.min(5, currentBox + 2));

    const containerStyle: React.CSSProperties = { perspective: '1000px' };
    const cardStyle: React.CSSProperties = {
        width: '100%', height: '100%', position: 'relative',
        transition: 'transform 0.6s', transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    };
    const faceStyle: React.CSSProperties = {
        position: 'absolute', width: '100%', height: '100%',
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        borderRadius: '1.5rem', boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
    };
    const backFaceStyle: React.CSSProperties = { ...faceStyle, transform: 'rotateY(180deg)' };

    return (
        <div className="flex flex-col items-center w-full max-w-sm md:max-w-md mx-auto">
            <div className="w-full flex justify-between mb-4 px-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Hàng đợi: {studyQueue.length - currentIndex}</span>
                <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Box: {currentBox}</span>
            </div>
            
            <div className="w-full h-64 md:h-96 mb-6 cursor-pointer group select-none" style={containerStyle} onClick={handleFlip}>
                <div style={cardStyle}>
                    <div style={faceStyle} className="bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                        <div className="absolute top-4 left-6 flex flex-col items-start gap-1">
                             <div className="w-8 h-1.5 bg-gray-200 rounded-full"></div>
                             <span className="text-gray-400 text-xs font-bold uppercase tracking-wide mt-1">{currentWord.type}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); speakText(currentWord.word); }} className="absolute top-4 right-6 w-10 h-10 bg-yellow-400 hover:bg-yellow-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 z-20">
                            <Volume2 size={20} />
                        </button>
                        <div className="text-center mt-4">
                            <h3 className="text-4xl md:text-5xl font-extrabold text-[#1a1a2e] mb-2">{currentWord.word}</h3>
                            <p className="text-lg text-gray-500 font-medium font-serif bg-gray-100 px-4 py-1 rounded-full inline-block">{currentWord.pronunciation}</p>
                        </div>
                        <div className="mt-auto flex flex-col items-center gap-2">
                             <div className="w-8 h-1.5 bg-gray-100 rounded-full"></div>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Chạm để xem nghĩa</p>
                        </div>
                    </div>
                    <div style={backFaceStyle} className="bg-white flex flex-col items-center justify-center p-6 border-4 border-indigo-50">
                         <div className="text-center w-full">
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 leading-relaxed">{currentWord.meaning}</h3>
                            <div className="w-full bg-gray-50 p-4 rounded-2xl text-left space-y-2 shadow-inner">
                                 <div className="flex items-center gap-3 text-sm text-gray-700 border-b border-gray-200 pb-2">
                                     <span className="font-bold text-indigo-500 min-w-[60px]">Cấp độ:</span> 
                                     <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{currentWord.level}</span>
                                 </div>
                                 {currentWord.synonyms && <div className="flex gap-3 text-xs text-gray-700"><span className="font-bold text-green-600 min-w-[60px]">ĐN:</span> <span className="italic">{currentWord.synonyms}</span></div>}
                                 {currentWord.antonyms && <div className="flex gap-3 text-xs text-gray-700"><span className="font-bold text-red-500 min-w-[60px]">TN:</span> <span className="italic">{currentWord.antonyms}</span></div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isFlipped ? (
                <div className="grid grid-cols-3 gap-3 w-full px-1 animate-in slide-in-from-bottom-4">
                    <button onClick={() => handleRate('again')} className="flex flex-col items-center py-3 rounded-xl bg-[#1e1e2e] border border-red-500/30 hover:bg-red-500/20 active:scale-95 transition-all">
                        <span className="text-xs text-gray-400 font-medium mb-1">{intervalAgain}</span>
                        <span className="text-red-400 font-bold uppercase">Quên</span>
                        <span className="text-[9px] text-red-500/70 mt-1">(Ôn ngay)</span>
                    </button>
                    <button onClick={() => handleRate('good')} className="flex flex-col items-center py-3 rounded-xl bg-[#1e1e2e] border border-blue-500/30 hover:bg-blue-500/20 active:scale-95 transition-all">
                        <span className="text-xs text-gray-400 font-medium mb-1">{intervalGood}</span>
                        <span className="text-blue-400 font-bold uppercase">Nhớ</span>
                    </button>
                    <button onClick={() => handleRate('easy')} className="flex flex-col items-center py-3 rounded-xl bg-[#1e1e2e] border border-green-500/30 hover:bg-green-500/20 active:scale-95 transition-all">
                        <span className="text-xs text-gray-400 font-medium mb-1">{intervalEasy}</span>
                        <span className="text-green-400 font-bold uppercase">Quá dễ</span>
                    </button>
                </div>
            ) : (
                <div className="h-[68px] flex items-center justify-center text-gray-500 text-sm">
                    (Lật thẻ để đánh giá)
                </div>
            )}
        </div>
    );
};

// --- MINI COMPONENTS FOR PRACTICE ---
const MiniQuizCard: React.FC<{ 
    word: VocabItem, 
    allWords: VocabItem[], 
    onResult: (correct: boolean) => void,
    feedbackState: {show: boolean, isCorrect: boolean} | null 
}> = ({ word, allWords, onResult, feedbackState }) => {
    const [options, setOptions] = useState<string[]>([]);
    
    useEffect(() => {
        // Random 3 distractors
        const others = allWords.filter(w => w.id !== word.id).map(w => w.meaning).sort(() => 0.5 - Math.random()).slice(0, 3);
        setOptions([...others, word.meaning].sort(() => 0.5 - Math.random()));
    }, [word, allWords]);

    return (
        <div className="w-full bg-[#1e1e2e] p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden">
            {/* Feedback Overlay */}
            {feedbackState && (
                <div className={`absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200`}>
                    <div className="text-center">
                        {feedbackState.isCorrect ? (
                            <CheckCircle2 size={64} className="text-green-500 mx-auto mb-2" />
                        ) : (
                            <XCircle size={64} className="text-red-500 mx-auto mb-2" />
                        )}
                        <h3 className={`text-2xl font-black uppercase ${feedbackState.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                            {feedbackState.isCorrect ? 'Chính xác! +1đ' : 'Sai rồi!'}
                        </h3>
                    </div>
                </div>
            )}

            <div className="text-center mb-6">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Trắc nghiệm</span>
                <h3 className="text-3xl font-black text-white">{word.word}</h3>
                <p className="text-gray-500 italic">{word.type}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
                {options.map((opt, i) => {
                    const isCorrectAnswer = opt === word.meaning;
                    // Nếu đang hiện feedback: 
                    // - Đáp án đúng hiện màu xanh
                    // - Nếu chọn sai, đáp án sai hiện màu đỏ (nhưng logic này nằm ở onResult)
                    // Ở đây ta highlight đáp án ĐÚNG khi user trả lời sai để họ học
                    let btnClass = "bg-black/20 border-white/5 text-gray-300";
                    
                    if (feedbackState && isCorrectAnswer) {
                        btnClass = "bg-green-500/20 border-green-500 text-green-400 font-bold";
                    }

                    return (
                        <button 
                            key={i} 
                            disabled={!!feedbackState}
                            onClick={() => onResult(opt === word.meaning)}
                            className={`p-4 rounded-xl border hover:bg-white/10 hover:border-white/20 hover:text-white transition-all text-left font-medium ${btnClass}`}
                        >
                            {opt}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

const MiniListeningCard: React.FC<{ 
    word: VocabItem, 
    onResult: (correct: boolean) => void,
    feedbackState: {show: boolean, isCorrect: boolean} | null 
}> = ({ word, onResult, feedbackState }) => {
    const [input, setInput] = useState('');
    
    useEffect(() => {
        setInput('');
        setTimeout(() => speakText(word.word), 500);
    }, [word]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedbackState) return;
        const correct = input.trim().toLowerCase() === word.word.toLowerCase();
        onResult(correct);
    };

    return (
        <div className="w-full bg-[#1e1e2e] p-6 rounded-2xl border border-white/10 shadow-xl text-center relative overflow-hidden">
             {/* Feedback Overlay */}
             {feedbackState && (
                <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200`}>
                    {feedbackState.isCorrect ? (
                        <>
                            <CheckCircle2 size={64} className="text-green-500 mb-2" />
                            <h3 className="text-2xl font-black text-green-500 uppercase">Chính xác! +1đ</h3>
                        </>
                    ) : (
                        <>
                            <XCircle size={64} className="text-red-500 mb-2" />
                            <h3 className="text-2xl font-black text-red-500 uppercase mb-2">Sai rồi!</h3>
                            <p className="text-gray-400 text-sm">Đáp án đúng:</p>
                            <p className="text-white font-bold text-xl">{word.word}</p>
                        </>
                    )}
                </div>
            )}

            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 block">Nghe & Điền từ</span>
            <button 
                onClick={() => speakText(word.word)} 
                className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-lg transition-all"
            >
                <Volume2 size={32} className="text-white" />
            </button>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Gõ từ bạn nghe được..."
                    disabled={!!feedbackState}
                    className="w-full bg-black/30 border border-gray-600 rounded-xl px-4 py-3 text-center text-white focus:outline-none focus:border-indigo-500 mb-4"
                    autoFocus
                />
                <button type="submit" disabled={!!feedbackState} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                    Kiểm tra
                </button>
            </form>
        </div>
    );
};

// ... (Các component phụ khác giữ nguyên)
// Removed unused 'theme' prop
const UserStatsView: React.FC<{ progress: Record<string, UserTopicProgress> }> = ({ progress }) => {
    const allProgress = Object.values(progress) as UserTopicProgress[];
    const boxCounts = [0, 0, 0, 0, 0, 0];
    let totalVocab = 0;
    
    allProgress.forEach(p => {
        const vocabState = p.vocabState || {};
        Object.values(vocabState).forEach(v => {
            if (v.box >= 0 && v.box <= 5) boxCounts[v.box]++;
            totalVocab++;
        });
    });

    const totalSeconds = allProgress.reduce((acc, curr) => acc + (curr.studySeconds || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);
    let totalScore = 0, totalQuizzes = 0;
    allProgress.forEach(p => {
        if (p.quizScores?.length > 0) {
            totalScore += p.quizScores.reduce((a, b) => a + b.score, 0);
            totalQuizzes += p.quizScores.length;
        }
    });
    const avgScore = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1e1e2e] p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2"><BrainCircuit size={14} className="text-pink-500" /> Mastered</div>
                    <div className="text-2xl font-bold text-white">{boxCounts[5] + boxCounts[4]} <span className="text-xs font-normal text-gray-500">từ</span></div>
                </div>
                <div className="bg-[#1e1e2e] p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2"><BookOpen size={14} className="text-blue-500" /> Đang học</div>
                    <div className="text-2xl font-bold text-white">{boxCounts[1] + boxCounts[2] + boxCounts[3]} <span className="text-xs font-normal text-gray-500">từ</span></div>
                </div>
                <div className="bg-[#1e1e2e] p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2"><Clock size={14} className="text-green-500" /> Tổng giờ</div>
                    <div className="text-2xl font-bold text-white">{totalHours} <span className="text-xs font-normal text-gray-500">giờ</span></div>
                </div>
                <div className="bg-[#1e1e2e] p-5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2"><Trophy size={14} className="text-yellow-500" /> Điểm TB</div>
                    <div className="text-2xl font-bold text-white">{avgScore} <span className="text-xs font-normal text-gray-500">điểm</span></div>
                </div>
            </div>
            <div className="bg-[#1e1e2e] p-6 rounded-2xl border border-white/5">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2"><PieChart size={18} /> Phân phối Leitner Box</h3>
                <div className="space-y-4">
                    {[{ label: 'Box 0 (Quên)', count: boxCounts[0], color: 'bg-red-500' }, { label: 'Box 1-3 (Đang học)', count: boxCounts[1]+boxCounts[2]+boxCounts[3], color: 'bg-yellow-500' }, { label: 'Box 4-5 (Thành thạo)', count: boxCounts[4]+boxCounts[5], color: 'bg-green-500' }].map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-xs text-gray-400 mb-1"><span>{item.label}</span><span>{item.count} từ</span></div>
                            <div className="w-full h-2 bg-gray-700 rounded-full"><div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${totalVocab ? (item.count/totalVocab)*100 : 0}%` }}></div></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const QuizView: React.FC<{ vocabList: VocabItem[], theme: ThemeConfig, onSaveScore: (score: number) => void, onSaveTime: (seconds: number) => void }> = ({ vocabList, theme, onSaveScore, onSaveTime }) => {
    const [qIndex, setQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [options, setOptions] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => { const interval = setInterval(() => { onSaveTime(1); }, 1000); return () => clearInterval(interval); }, [onSaveTime]);

    const question = vocabList[qIndex];
    useEffect(() => {
        if (!question) return;
        const otherMeanings = vocabList.filter(v => v.id !== question.id).map(v => v.meaning).sort(() => 0.5 - Math.random()).slice(0, 3);
        setOptions([...otherMeanings, question.meaning].sort(() => 0.5 - Math.random()));
        setSelected(null);
    }, [qIndex, question, vocabList]);

    const handleAnswer = (ans: string) => {
        if (selected) return;
        setSelected(ans);
        if (ans === question.meaning) { playSound('correct'); setScore(s => s + 10); setTimeout(() => nextQuestion(), 1000); } else playSound('wrong');
    };

    const nextQuestion = () => {
        if (qIndex < vocabList.length - 1) setQIndex(prev => prev + 1);
        else { setIsFinished(true); playSound('win'); onSaveScore(score); }
    };

    if (isFinished) return <div className="text-center py-10"><h2 className="text-4xl font-bold text-white mb-2">Điểm: {score}</h2><button onClick={() => { setQIndex(0); setScore(0); setIsFinished(false); }} className={`px-8 py-3 rounded-full bg-white text-black font-bold`}>Làm lại</button></div>;

    const progressPercent = ((qIndex + 1) / vocabList.length) * 100;
    return (
        <div className="max-w-md mx-auto flex flex-col h-full">
            <div className="w-full h-1.5 bg-gray-800 rounded-full mb-4"><div className={`h-full bg-gradient-to-r ${theme.buttonGradient}`} style={{width: `${progressPercent}%`}}></div></div>
            <div className="flex-grow flex flex-col items-center justify-center py-8">
                 <h3 className="text-3xl font-black text-white mb-2">{question.word}</h3>
                 <button onClick={() => speakText(question.word)} className="p-2 bg-white/10 rounded-full mb-6"><Volume2 size={20} /></button>
            </div>
            <div className="flex flex-col gap-2 pb-12">
                {options.map((opt, i) => (
                    <button key={i} onClick={() => handleAnswer(opt)} disabled={!!selected} className={`p-4 rounded-xl text-left font-bold transition-all ${selected ? (opt === question.meaning ? 'bg-green-500 text-white' : (opt === selected ? 'bg-red-500 text-white' : 'bg-[#1e1e2e] opacity-50')) : 'bg-[#1e1e2e] hover:bg-[#2a2a3e] border border-gray-700'}`}>{opt}</button>
                ))}
            </div>
            {selected && selected !== question.meaning && <button onClick={nextQuestion} className="w-full py-4 rounded-xl bg-white text-black font-bold mb-4">Tiếp theo</button>}
        </div>
    );
};

// Removed unused 'theme' prop
const ListeningView: React.FC<{ vocabList: VocabItem[] }> = ({ vocabList }) => {
    const [index, setIndex] = useState(0);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const currentWord = vocabList[index];

    useEffect(() => { setInput(''); setStatus('idle'); setTimeout(() => speakText(currentWord.word), 500); }, [index]);

    const checkAnswer = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.toLowerCase().trim() === currentWord.word.toLowerCase()) { setStatus('correct'); playSound('correct'); setTimeout(() => setIndex((i) => (i + 1) % vocabList.length), 1500); } 
        else { setStatus('wrong'); playSound('wrong'); }
    };

    return (
        <div className="max-w-md mx-auto text-center">
             <div className="p-8 rounded-3xl mb-8 bg-white/5 flex flex-col items-center border border-white/10">
                 <button onClick={() => speakText(currentWord.word)} className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mb-6 shadow-lg"><Volume2 size={32} /></button>
                 {status === 'correct' ? <p className="text-green-400 font-black text-3xl animate-in zoom-in">{currentWord.word}</p> : <p className="text-gray-400 text-sm">Nghe và điền từ</p>}
             </div>
             <form onSubmit={checkAnswer} className="relative">
                 <input type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={status === 'correct'} className={`w-full bg-black/30 border-2 rounded-2xl px-4 py-4 text-center text-xl font-bold focus:outline-none ${status === 'correct' ? 'border-green-500 text-green-400' : status === 'wrong' ? 'border-red-500 text-red-400' : 'border-gray-700 text-white'}`} placeholder="..." autoFocus />
             </form>
             {status !== 'correct' && <button onClick={() => { setStatus('wrong'); setInput(currentWord.word); }} className="mt-4 text-xs text-gray-500 underline">Xem đáp án</button>}
             {status === 'wrong' && <button onClick={() => setIndex((i) => (i + 1) % vocabList.length)} className="block mx-auto mt-4 px-6 py-2 bg-white/10 rounded-full text-sm font-bold">Bỏ qua</button>}
        </div>
    );
};

const CodeSnippetView: React.FC<{ topicId: string, theme: ThemeConfig }> = ({ topicId, theme }) => {
    const [code, setCode] = useState('');
    const [title, setTitle] = useState('');
    const [snippets, setSnippets] = useState<{id: string, title: string, code: string}[]>([]);
    useEffect(() => { const saved = localStorage.getItem(`snippets_${topicId}`); if (saved) setSnippets(JSON.parse(saved)); }, [topicId]);
    const saveSnippet = () => { if (!code.trim()) return; const updated = [{ id: Date.now().toString(), title, code }, ...snippets]; setSnippets(updated); localStorage.setItem(`snippets_${topicId}`, JSON.stringify(updated)); setCode(''); setTitle(''); };
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><input className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-2 mb-2 text-white text-sm" placeholder="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} /><textarea className="w-full h-64 bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 text-green-400 font-mono text-xs resize-none" placeholder="// Code..." value={code} onChange={(e) => setCode(e.target.value)} /><button onClick={saveSnippet} className={`w-full mt-2 py-2 rounded-lg bg-gradient-to-r ${theme.buttonGradient} text-white font-bold`}>Lưu</button></div>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">{snippets.map(s => (<div key={s.id} className="bg-[#1e1e1e] rounded-xl border border-gray-800 mb-4 overflow-hidden"><div className="bg-gray-800 px-4 py-2 text-xs font-bold text-gray-300">{s.title}</div><pre className="p-4 text-xs text-blue-300 overflow-x-auto"><code>{s.code}</code></pre></div>))}</div>
        </div>
    );
};

// Removed unused 'theme' prop
const VocabListView: React.FC<{
    vocabList: VocabItem[],
    userProgress: UserTopicProgress | undefined,
    onResetWord: (wordId: string) => void
}> = ({ vocabList, userProgress, onResetWord }) => {
    const vocabState = userProgress?.vocabState || {};
    const now = Date.now();

    const sortedList = useMemo(() => {
        return [...vocabList].sort((a, b) => {
            const stateA = vocabState[a.id];
            const stateB = vocabState[b.id];
            const dueA = stateA && stateA.nextReview <= now ? 1 : 0;
            const dueB = stateB && stateB.nextReview <= now ? 1 : 0;
            if (dueA !== dueB) return dueB - dueA;
            const timeA = stateA?.nextReview || 0;
            const timeB = stateB?.nextReview || 0;
            return timeA - timeB;
        });
    }, [vocabList, vocabState]);

    const getStatusColor = (box: number) => {
        if (box === 0) return "bg-red-500/20 text-red-400 border-red-500/30";
        if (box < 3) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        return "bg-green-500/20 text-green-400 border-green-500/30";
    };

    const getReviewText = (nextReview: number) => {
        if (!nextReview) return "Chưa học";
        if (nextReview <= now) return "Cần ôn ngay";
        const diff = nextReview - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff / (1000 * 60)) % 60);
            if (hours === 0) return mins > 0 ? `${mins} phút nữa` : "Sắp tới";
            return `${hours} giờ nữa`;
        }
        return `${days} ngày nữa`;
    };

    return (
        <div className="pb-24 px-1">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <List size={20} className="text-indigo-400" /> Danh sách từ vựng & Trạng thái SRS
            </h3>
            <div className="space-y-3">
                {sortedList.map(word => {
                    const state = vocabState[word.id];
                    const box = state?.box || 0;
                    const nextReview = state?.nextReview || 0;
                    const isDue = nextReview <= now && nextReview > 0;

                    return (
                        <div key={word.id} className="bg-[#1e1e2e] rounded-xl p-4 border border-white/5 flex items-center justify-between gap-3 group hover:border-white/20 transition-all">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-white text-lg truncate">{word.word}</h4>
                                    <span className="text-xs text-gray-500 bg-black/30 px-1.5 py-0.5 rounded font-mono">{word.type}</span>
                                    <button onClick={() => speakText(word.word)} className="p-1 text-gray-500 hover:text-white transition-colors"><Volume2 size={14} /></button>
                                </div>
                                <p className="text-sm text-gray-400 truncate">{word.meaning}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getStatusColor(box)}`}>
                                        Box {box}
                                    </span>
                                    <span className={`text-[10px] flex items-center gap-1 ${isDue ? 'text-red-400 font-bold animate-pulse' : 'text-gray-500'}`}>
                                        <Clock size={10} /> {getReviewText(nextReview)}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => { if(window.confirm(`Bạn muốn ôn lại từ "${word.word}" ngay bây giờ?`)) onResetWord(word.id); }}
                                className="p-3 bg-white/5 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400 rounded-xl transition-colors border border-transparent hover:border-indigo-500/30 flex-shrink-0"
                                title="Học lại từ đầu (Reset)"
                            >
                                <RotateCcw size={20} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EnglishHub;