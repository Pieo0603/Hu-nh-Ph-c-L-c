import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { StudyLog, ThemeConfig, LeaderboardEntry, AppUser } from '../types';
import { Play, Pause, Square, CheckCircle, Clock, BookOpen, LogOut, LayoutList, Trophy, User as UserIcon, AlertCircle, ArrowRight, History, Lock, Trash2, GraduationCap, Link as LinkIcon, Quote, Flame, Palette, Settings2, X } from 'lucide-react';

interface StudyTrackerProps {
  theme: ThemeConfig;
  user: AppUser | null;
  onViewProfile?: (userId: string) => void;
}

// Cấu hình môn học với Icon và Màu sắc đặc trưng
const SUBJECT_CONFIG: Record<string, { icon: string, color: string }> = {
  "Toán": { icon: "∑", color: "text-blue-500" },
  "Lý": { icon: "Ω", color: "text-purple-500" },
  "Hóa": { icon: "⚗️", color: "text-green-500" },
  "Sinh": { icon: "🧬", color: "text-emerald-500" },
  "Văn": { icon: "✒️", color: "text-orange-500" },
  "Anh": { icon: "ABC", color: "text-pink-500" },
  "Sử": { icon: "⚔️", color: "text-yellow-600" },
  "Địa": { icon: "🌍", color: "text-cyan-500" },
  "KTPL": { icon: "⚖️", color: "text-indigo-400" },
  "CNTT": { icon: "</>", color: "text-gray-400" }
};

const SUBJECTS = Object.keys(SUBJECT_CONFIG);

// Quote "gắt" hơn, đánh vào tâm lý mất mát
const HARD_QUOTES = [
    "Mỗi phút lười = 1 bước tụt lại phía sau. 📉",
    "Mày dừng lại, đối thủ đang lật trang sách tiếp theo.",
    "Đau khổ của kỷ luật nhẹ tựa lông hồng, đau khổ của hối hận nặng tựa thái sơn.",
    "Học đi, đừng để nước mắt rơi trên bài thi.",
    "Không có áp lực, không có kim cương. 💎",
    "Tương lai khóc hay cười phụ thuộc vào độ lười của quá khứ.",
    "Ngủ bây giờ thì có giấc mơ, nhưng học bây giờ thì biến giấc mơ thành sự thật.",
    "Đừng cúi đầu, vương miện sẽ rơi. 👑",
    "Nếu dễ dàng thì ai cũng đỗ Đại học rồi.",
    "Chỉ còn XXX ngày nữa là thi, mày định chơi đến bao giờ?"
];

type TabView = 'timer' | 'leaderboard' | 'profile';

const StudyTracker: React.FC<StudyTrackerProps> = ({ theme, user, onViewProfile }) => {
  const [activeTab, setActiveTab] = useState<TabView>('timer');
  
  // Data States
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [userHistory, setUserHistory] = useState<StudyLog[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0); 
  const [startTimeStr, setStartTimeStr] = useState<string>("");
  const [endTimeStr, setEndTimeStr] = useState<string>("");
  const [currentQuote, setCurrentQuote] = useState<string>("");
  
  // Customization State (In-Timer)
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [customBgColor, setCustomBgColor] = useState("#000000");
  const [customTextColor, setCustomTextColor] = useState("#9ca3af"); // Màu chữ phụ (Label, Quote)
  const [customNumberColor, setCustomNumberColor] = useState("#9ca3af"); // Màu số chính (Mặc định XÁM)

  // Form State
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [targetMinutes, setTargetMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Tính Streak (Số buổi học hôm nay)
  const todayStreak = useMemo(() => {
      if (!user) return 0;
      const today = new Date().toDateString();
      return userHistory.filter(log => new Date(log.timestamp).toDateString() === today).length;
  }, [userHistory, user]);

  // 1. Fetch Recent Logs
  useEffect(() => {
    try {
        const unsubscribe = db.collection("study_logs")
          .orderBy("timestamp", "desc")
          .limit(200)
          .onSnapshot((snapshot) => {
          const fetchedLogs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as StudyLog[];
          
          setLogs(fetchedLogs);

          // Calculate Leaderboard
          const stats: Record<string, LeaderboardEntry> = {};
          fetchedLogs.forEach(log => {
             if (!stats[log.userId]) {
                stats[log.userId] = {
                    userId: log.userId,
                    userName: log.userName,
                    userAvatar: log.userAvatar,
                    totalMinutes: 0,
                    sessionsCount: 0,
                    lastActive: log.timestamp
                };
             }
             stats[log.userId].totalMinutes += log.durationMinutes;
             stats[log.userId].sessionsCount += 1;
             if (log.timestamp > stats[log.userId].lastActive) {
                 stats[log.userId].lastActive = log.timestamp;
             }
          });

          const sortedLeaderboard = Object.values(stats).sort((a, b) => b.totalMinutes - a.totalMinutes);
          setLeaderboard(sortedLeaderboard);

        }, (error) => {
           console.error("Lỗi tải nhật ký:", error);
        });
        return () => unsubscribe();
    } catch (e) {
        console.error("Lỗi init:", e);
    }
  }, []);

  // 2. Fetch User History
  useEffect(() => {
    if (user) {
         // Lọc từ logs local để đỡ tốn read nếu chưa có index phức tạp
         const myLogs = logs.filter(l => l.userId === user.uid);
         setUserHistory(myLogs);
    }
  }, [user, logs]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleUserClick = (userId: string) => {
      if (onViewProfile) {
          onViewProfile(userId);
      }
  };

  const startSession = () => {
    if (!user) {
      alert("Bạn chưa đăng nhập!");
      return;
    }
    if (targetMinutes <= 0) {
        alert("Thời gian mục tiêu phải lớn hơn 0!");
        return;
    }
    const now = new Date();
    setStartTimeStr(now.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}));
    const end = new Date(now.getTime() + targetMinutes * 60000);
    setEndTimeStr(end.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}));
    
    // Random quote gắt
    const randomQuote = HARD_QUOTES[Math.floor(Math.random() * HARD_QUOTES.length)];
    // Thay thế XXX bằng số ngày còn lại (giả sử thi 27/6/2026)
    const examDate = new Date('2026-06-27');
    const daysLeft = Math.floor((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    setCurrentQuote(randomQuote.replace('XXX', daysLeft.toString()));

    setIsSessionActive(true);
    setIsTimerRunning(true);
    setElapsedSeconds(0);
  };

  const finishSession = async () => {
    if (!user) return;
    setIsTimerRunning(false);
    const durationMinutes = Math.floor(elapsedSeconds / 60);
    try {
        await db.collection("study_logs").add({
            userId: user.uid,
            userName: user.displayName || "Bạn học bí ẩn",
            userAvatar: user.photoURL || "",
            subject,
            durationMinutes: durationMinutes > 0 ? durationMinutes : 1,
            targetMinutes,
            notes: notes || "Đã hoàn thành buổi học!",
            isCompleted: durationMinutes >= targetMinutes,
            timestamp: Date.now()
        });
        setIsSessionActive(false);
        setElapsedSeconds(0);
        setNotes('');
        alert("Đã lưu thành tích! +1 vào chuỗi học tập 🔥");
        setActiveTab('profile');
    } catch (e: any) {
        console.error("Error saving log", e);
        setIsSessionActive(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
      if (!window.confirm("Xóa bản ghi này?")) return;
      try {
          await db.collection("study_logs").doc(logId).delete();
      } catch (e) {
          console.error(e);
      }
  };

  // --- COMPONENT CON: FLIP CARD (Updated for Custom Colors) ---
  const FlipCard = ({ value, label, customColor }: { value: number, label?: string, customColor: string }) => {
      const valStr = value < 10 ? `0${value}` : `${value}`;
      return (
          <div className="flex flex-col items-center gap-2">
            <div className={`relative w-24 h-32 md:w-40 md:h-56 lg:w-48 lg:h-64 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl`}>
                <span 
                    className={`font-heading text-6xl md:text-8xl lg:text-9xl font-bold transition-colors duration-500`}
                    style={{ color: customColor }}
                >
                    {valStr}
                </span>
            </div>
            {label && <span className="text-xs uppercase tracking-widest font-bold opacity-60" style={{ color: customTextColor }}>{label}</span>}
          </div>
      );
  };

  // ----------------------------------------------------------------------
  // VIEW: TIMER ACTIVE (FULLSCREEN OVERLAY)
  // ----------------------------------------------------------------------
  if (isSessionActive) {
      const totalTargetSeconds = targetMinutes * 60;
      let remainingSeconds = totalTargetSeconds - elapsedSeconds;
      if (remainingSeconds < 0) remainingSeconds = 0;
      
      const percent = Math.min(100, (elapsedSeconds / totalTargetSeconds) * 100);
      
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      // Logic cũ: Đổi màu theo thời gian -> BỎ QUA theo yêu cầu
      // Chỉ giữ hiệu ứng pulse/rung khi sắp hết giờ
      let pulseEffect = "";
      let timeStatusText = "Đang tập trung";

      if (remainingSeconds < 300) { 
           timeStatusText = "Tăng tốc!";
      }
      if (remainingSeconds < 60) { 
           pulseEffect = "animate-pulse"; // Vẫn giữ hiệu ứng nhấp nháy để báo động
           timeStatusText = "Sắp hết giờ!";
      }

      return (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden transition-colors duration-500" style={{ backgroundColor: customBgColor }}>
              
              {/* Customization Button */}
              <div className="absolute top-6 right-6 z-50">
                   <button onClick={() => setShowColorSettings(!showColorSettings)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                       {showColorSettings ? <X size={20}/> : <Settings2 size={20}/>}
                   </button>
                   {showColorSettings && (
                       <div className="absolute top-12 right-0 bg-[#1e1e2e] p-4 rounded-xl border border-white/10 shadow-2xl w-72 animate-in slide-in-from-top-2">
                           <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><Palette size={14}/> Tùy chỉnh giao diện</h4>
                           <div className="space-y-4">
                               {/* Background Color */}
                               <div>
                                   <label className="text-xs text-gray-400 block mb-1.5 font-bold uppercase">Màu nền</label>
                                   <div className="flex gap-2">
                                       {['#000000', '#1a1a2e', '#0f172a', '#271a1a', '#052e16'].map(c => (
                                           <button key={c} onClick={() => setCustomBgColor(c)} className={`w-8 h-8 rounded-full border border-white/20 shadow-md ${customBgColor === c ? 'ring-2 ring-white scale-110' : ''}`} style={{background: c}} />
                                       ))}
                                   </div>
                               </div>

                               {/* Number Color - QUAN TRỌNG: Mặc định Xám và tự do chỉnh */}
                               <div>
                                   <label className="text-xs text-gray-400 block mb-1.5 font-bold uppercase">Màu số đếm</label>
                                   <div className="flex gap-2 flex-wrap">
                                       {/* Các màu Preset: XÁM (Default), Vàng, Đỏ, Xanh, Trắng */}
                                       {['#9ca3af', '#fbbf24', '#ef4444', '#10b981', '#ffffff'].map(c => (
                                           <button 
                                                key={c} 
                                                onClick={() => setCustomNumberColor(c)} 
                                                className={`w-8 h-8 rounded-full border border-white/20 shadow-md flex items-center justify-center ${customNumberColor === c ? 'ring-2 ring-white scale-110' : ''}`} 
                                                style={{background: c}}
                                           />
                                       ))}
                                       {/* Input Color Picker tự do */}
                                       <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 shadow-md">
                                           <input 
                                                type="color" 
                                                value={customNumberColor} 
                                                onChange={(e) => setCustomNumberColor(e.target.value)} 
                                                className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 border-0 cursor-pointer" 
                                           />
                                       </div>
                                   </div>
                               </div>

                               {/* Text Color */}
                               <div>
                                   <label className="text-xs text-gray-400 block mb-1.5 font-bold uppercase">Màu chữ phụ</label>
                                   <div className="flex gap-2">
                                       {['#ffffff', '#9ca3af', '#6b7280', '#fbbf24'].map(c => (
                                           <button key={c} onClick={() => setCustomTextColor(c)} className={`w-6 h-6 rounded-full border border-white/20 ${customTextColor === c ? 'ring-2 ring-white' : ''}`} style={{background: c}} />
                                       ))}
                                   </div>
                               </div>
                           </div>
                       </div>
                   )}
              </div>

              {/* Header Info (Subject Badge) */}
              <div className="flex flex-col items-center gap-2 mb-4 md:mb-12 animate-in slide-in-from-top-10 duration-700">
                  <span className="text-xs md:text-sm font-bold tracking-[0.3em] uppercase opacity-70" style={{ color: customTextColor }}>
                      {timeStatusText}
                  </span>
                  <div className="inline-flex items-center gap-3 px-8 py-2.5 rounded-full border border-white/10 bg-[#111]/50 backdrop-blur-md shadow-xl">
                      <span className="text-2xl">{SUBJECT_CONFIG[subject].icon}</span>
                      <span className="text-xl md:text-2xl font-black uppercase tracking-widest" style={{ color: customNumberColor }}>{subject}</span>
                  </div>
              </div>
              
              {/* Main Timer Display */}
              <div className={`flex justify-center items-center gap-2 md:gap-6 mb-8 md:mb-12 scale-75 md:scale-90 lg:scale-100 origin-center ${pulseEffect}`}>
                  <FlipCard value={hours} label="Giờ" customColor={customNumberColor} />
                  <span className={`text-4xl md:text-6xl font-bold -mt-8`} style={{ color: customNumberColor }}>:</span>
                  <FlipCard value={minutes} label="Phút" customColor={customNumberColor} />
                  <span className={`text-4xl md:text-6xl font-bold -mt-8`} style={{ color: customNumberColor }}>:</span>
                  <FlipCard value={seconds} label="Giây" customColor={customNumberColor} />
              </div>

              {/* Progress Bar & Stats */}
              <div className="w-full max-w-3xl px-6 flex flex-col items-center gap-8">
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-gray-800/50 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full transition-all duration-1000 ease-linear`}
                        style={{ width: `${percent}%`, backgroundColor: customNumberColor }}
                      ></div>
                  </div>

                  {/* Motivational Quote */}
                  <div className="text-center max-w-xl h-16 px-4 flex items-center justify-center">
                      <p className="text-sm md:text-xl font-medium transition-opacity duration-1000 leading-relaxed font-hand tracking-wide" style={{ color: customTextColor }}>
                          "{currentQuote}"
                      </p>
                  </div>
                  
                  {/* Streak Info */}
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
                      <Flame size={14} className="text-orange-500 fill-orange-500" />
                      <span className="text-xs font-bold" style={{ color: customTextColor }}>Chuỗi hôm nay: {todayStreak} phiên</span>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-center gap-8 mt-2">
                      {!isTimerRunning ? (
                          remainingSeconds > 0 && (
                            <button onClick={() => setIsTimerRunning(true)} className={`w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg transition-all transform hover:scale-110 group hover:bg-white/10`}>
                                <Play size={32} fill={customNumberColor} style={{ color: customNumberColor }} />
                            </button>
                          )
                      ) : (
                          <button onClick={() => setIsTimerRunning(false)} className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg transition-all transform hover:scale-110 group hover:bg-white/10">
                             <Pause size={32} fill={customNumberColor} style={{ color: customNumberColor }} />
                          </button>
                      )}
                      
                      {/* Stop Button */}
                      <div className="relative group">
                          <button onClick={finishSession} className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg transition-all transform hover:scale-110 hover:bg-red-500/10 hover:border-red-500/50">
                             <Square size={24} fill="#ef4444" className="text-red-500" />
                          </button>
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-40 p-2 bg-red-600 text-white text-[10px] font-bold text-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                              ⚠️ Dừng bây giờ sẽ kết thúc phiên học này!
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-red-600"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // ----------------------------------------------------------------------
  // MAIN APP VIEW
  // ----------------------------------------------------------------------
  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-10">
       
       {/* USER GREETING & HEADER */}
       {user ? (
           <div className="flex justify-between items-center mb-6 animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-3">
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} alt="User" className="w-10 h-10 rounded-full border border-white/20 object-cover" />
                        <div>
                            <h3 className="text-base font-bold text-white leading-tight">{user.displayName}</h3>
                            <div className="flex items-center gap-2">
                                <p className={`text-[10px] uppercase font-bold tracking-wider ${theme.text}`}>Chiến binh 2026</p>
                                <span className="text-[10px] text-orange-400 flex items-center gap-0.5 bg-orange-500/10 px-1.5 rounded"><Flame size={10} fill="currentColor"/> {todayStreak}</span>
                            </div>
                        </div>
                </div>
           </div>
       ) : (
           <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3 animate-in fade-in duration-300">
               <div className="p-2 bg-orange-500/20 rounded-full"><Lock size={16} className="text-orange-400" /></div>
               <div>
                   <h3 className="text-sm font-bold text-white">Chế độ xem trước</h3>
                   <p className="text-xs text-gray-400">Bạn cần đăng nhập (Góc trái) để lưu lịch sử và tính giờ học.</p>
               </div>
           </div>
       )}

       {/* SUB-TABS */}
       <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-xl mb-6 border border-white/5">
            <button onClick={() => setActiveTab('timer')} className={`py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'timer' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                <Clock size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Bấm giờ</span> <span className="sm:hidden">Học</span>
            </button>
            <button onClick={() => setActiveTab('leaderboard')} className={`py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'leaderboard' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                <Trophy size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Xếp hạng</span> <span className="sm:hidden">Top</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                <UserIcon size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Hồ sơ</span> <span className="sm:hidden">Tôi</span>
            </button>
       </div>

       {/* CONTENT AREA */}
       
       {/* 1. TIMER TAB */}
       {activeTab === 'timer' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="lg:col-span-1">
                 <div className={`hover-shine glass-panel p-5 rounded-2xl shadow-xl ${theme.shadow} border-t border-white/10 sticky top-24 ${!user ? 'opacity-70 grayscale' : ''}`}>
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme.text}`}>
                       <Play size={20} /> Thiết lập Hẹn Giờ
                    </h3>
                    <div className="space-y-5">
                       <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wider">Môn học</label>
                          <div className="grid grid-cols-3 gap-2">
                             {SUBJECTS.map(sub => (
                                <button 
                                    key={sub} 
                                    onClick={() => setSubject(sub)} 
                                    className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${subject === sub ? `bg-white/10 text-white border-white/20 shadow-lg` : 'bg-black/20 text-gray-500 border-transparent hover:bg-white/5'}`}
                                >
                                   <span className="text-base">{SUBJECT_CONFIG[sub].icon}</span>
                                   <span>{sub}</span>
                                </button>
                             ))}
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wider">Thời gian: {targetMinutes} phút</label>
                          <div className="flex items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                              <span className="text-xs text-gray-400">5p</span>
                              <input type="range" min="5" max="180" step="5" value={targetMinutes} onChange={(e) => setTargetMinutes(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white touch-none" />
                              <span className="text-xs text-gray-400">180p</span>
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wider">Mục tiêu hôm nay</label>
                          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="VD: Giải hết đề Toán 2024..." className="w-full bg-black/20 border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/50 resize-none h-20" />
                       </div>
                       
                       <button onClick={startSession} className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white font-bold shadow-lg transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-base`}>
                         {user ? <><Play size={18} fill="currentColor" /> BẮT ĐẦU NGAY</> : <><Lock size={18} /> ĐĂNG NHẬP ĐỂ BẮT ĐẦU</>}
                       </button>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-2">
                 <div className="flex items-center justify-between mb-4 mt-4 lg:mt-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><LayoutList size={20} className="text-yellow-400" /> Bảng vàng Live</h3>
                    <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-full flex items-center gap-1 uppercase font-bold tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online</span>
                 </div>
                 <div className="space-y-2">
                    {logs.slice(0, 10).map((log) => (
                        <div key={log.id} className="hover-shine glass-panel p-3 rounded-xl flex items-center gap-3 hover:bg-white/5 transition-colors">
                           <img 
                                src={log.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${log.userName}`} 
                                alt="avt" 
                                className="w-9 h-9 rounded-full border border-gray-600 object-cover cursor-pointer hover:border-white/50" 
                                onClick={() => handleUserClick(log.userId)}
                           />
                           <div className="flex-grow min-w-0">
                               <div className="flex justify-between items-baseline">
                                  <span 
                                    className={`font-bold text-sm truncate pr-2 cursor-pointer hover:underline ${user && log.userId === user.uid ? theme.text : 'text-white'}`}
                                    onClick={() => handleUserClick(log.userId)}
                                  >
                                      {log.userName}
                                  </span>
                                  <span className="text-[10px] text-gray-500 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                               </div>
                               <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 truncate">
                                  <span className={`bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-bold ${SUBJECT_CONFIG[log.subject]?.color || 'text-white'}`}>
                                      {SUBJECT_CONFIG[log.subject]?.icon} {log.subject}
                                  </span>
                                  <span>{log.durationMinutes} phút</span>
                               </div>
                           </div>
                           {log.isCompleted && <div className="p-1.5 bg-green-500/20 rounded-full"><CheckCircle size={14} className="text-green-500" /></div>}
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-center py-10 text-gray-500 text-sm">Chưa có ai học hôm nay.</div>}
                 </div>
              </div>
           </div>
       )}

       {/* 2. LEADERBOARD TAB (Giữ nguyên logic) */}
       {activeTab === 'leaderboard' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="text-center mb-6 md:mb-10">
                   <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 mb-1 uppercase tracking-widest">Bảng Xếp Hạng</h2>
                   <p className="text-xs text-gray-400">Dựa trên tổng thời gian học tập chăm chỉ</p>
               </div>

               {/* Top 3 Podium */}
               <div className="flex justify-center items-end gap-2 md:gap-6 mb-8 px-2">
                   {/* Rank 2 */}
                   {leaderboard[1] && (
                       <div className="hover-shine w-1/3 max-w-[140px] bg-[#1a1a1a] rounded-t-xl p-2 md:p-6 flex flex-col items-center border-t-2 md:border-t-4 border-gray-400 relative group cursor-pointer" onClick={() => handleUserClick(leaderboard[1].userId)}>
                           <div className="absolute -top-3 md:-top-5 w-6 h-6 md:w-10 md:h-10 bg-gray-400 rounded-full flex items-center justify-center font-bold text-black shadow-lg text-xs md:text-base">2</div>
                           <img src={leaderboard[1].userAvatar} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-4 border-gray-400 mb-2 md:mb-3 object-cover transition-transform group-hover:scale-105" alt="Top 2" />
                           <h3 className="font-bold text-xs md:text-lg text-gray-200 line-clamp-1 w-full text-center group-hover:text-white transition-colors">{leaderboard[1].userName}</h3>
                           <p className="text-gray-500 text-[10px] md:text-sm mb-1">{leaderboard[1].sessionsCount} buổi</p>
                           <div className="bg-gray-800 px-2 py-0.5 md:px-4 md:py-1 rounded-full text-white font-mono font-bold text-[10px] md:text-sm">{leaderboard[1].totalMinutes}p</div>
                       </div>
                   )}
                   {/* Rank 1 */}
                   {leaderboard[0] && (
                       <div className="hover-shine w-1/3 max-w-[160px] bg-[#222] rounded-t-xl p-3 md:p-8 flex flex-col items-center border-t-4 border-yellow-400 pb-8 md:pb-10 shadow-2xl shadow-yellow-500/10 z-10 relative -top-4 md:-top-0 group cursor-pointer" onClick={() => handleUserClick(leaderboard[0].userId)}>
                           <div className="absolute -top-4 md:-top-6 w-8 h-8 md:w-12 md:h-12 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-black shadow-lg text-sm md:text-xl">1</div>
                           <Trophy className="text-yellow-400 mb-1 md:mb-2 w-4 h-4 md:w-8 md:h-8" />
                           <img src={leaderboard[0].userAvatar} className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 md:border-4 border-yellow-400 mb-2 md:mb-4 object-cover transition-transform group-hover:scale-105" alt="Top 1" />
                           <h3 className="font-bold text-xs md:text-xl text-white line-clamp-1 w-full text-center group-hover:text-yellow-400 transition-colors">{leaderboard[0].userName}</h3>
                           <div className="mt-2 bg-gradient-to-r from-yellow-600 to-orange-600 px-3 py-1 md:px-6 md:py-2 rounded-full text-white font-mono font-bold text-xs md:text-lg shadow-lg">{leaderboard[0].totalMinutes}p</div>
                       </div>
                   )}
                   {/* Rank 3 */}
                   {leaderboard[2] && (
                       <div className="hover-shine w-1/3 max-w-[140px] bg-[#1a1a1a] rounded-t-xl p-2 md:p-6 flex flex-col items-center border-t-2 md:border-t-4 border-orange-700 relative group cursor-pointer" onClick={() => handleUserClick(leaderboard[2].userId)}>
                           <div className="absolute -top-3 md:-top-5 w-6 h-6 md:w-10 md:h-10 bg-orange-700 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-xs md:text-base">3</div>
                           <img src={leaderboard[2].userAvatar} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-4 border-orange-700 mb-2 md:mb-3 object-cover transition-transform group-hover:scale-105" alt="Top 3" />
                           <h3 className="font-bold text-xs md:text-lg text-orange-200 line-clamp-1 w-full text-center group-hover:text-white transition-colors">{leaderboard[2].userName}</h3>
                           <p className="text-gray-500 text-[10px] md:text-sm mb-1">{leaderboard[2].sessionsCount} buổi</p>
                           <div className="bg-gray-800 px-2 py-0.5 md:px-4 md:py-1 rounded-full text-white font-mono font-bold text-[10px] md:text-sm">{leaderboard[2].totalMinutes}p</div>
                       </div>
                   )}
               </div>

               {/* List Ranks 4+ */}
               <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5">
                   {leaderboard.slice(3).map((user, idx) => (
                       <div key={user.userId} className="hover-shine flex items-center p-3 md:p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => handleUserClick(user.userId)}>
                           <div className="w-8 text-center font-bold text-gray-600 text-sm">#{idx + 4}</div>
                           <img src={user.userAvatar} className="w-8 h-8 md:w-10 md:h-10 rounded-full mx-3 object-cover group-hover:border-white/50 border border-transparent transition-all" alt="User" />
                           <div className="flex-grow">
                               <h4 className="font-bold text-gray-300 text-sm group-hover:text-white transition-colors">{user.userName}</h4>
                               <p className="text-[10px] text-gray-500">{user.sessionsCount} buổi học</p>
                           </div>
                           <div className="font-mono font-bold text-white text-sm">{user.totalMinutes}p</div>
                       </div>
                   ))}
                   {leaderboard.length === 0 && <div className="p-8 text-center text-gray-500">Chưa có dữ liệu xếp hạng</div>}
               </div>
           </div>
       )}

       {/* 3. PROFILE / HISTORY TAB */}
       {activeTab === 'profile' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               {user ? (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {/* User Stat Card */}
                       <div className="md:col-span-1">
                           <div className="hover-shine glass-panel p-6 rounded-2xl text-center sticky top-24">
                               <div className="relative inline-block mb-4">
                                    <img src={user.photoURL || ""} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/10 object-cover shadow-2xl" alt="Me" />
                                    <div className="absolute bottom-1 right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-[#1e1e2e]"></div>
                               </div>
                               <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{user.displayName}</h2>
                               {user.className && <p className="text-sm text-indigo-400 font-bold mb-1">{user.className}</p>}
                               
                               {/* BIO SECTION */}
                               {user.bio && (
                                   <div className="mt-3 relative px-2">
                                       <Quote size={12} className="absolute top-0 left-0 text-gray-600 -scale-x-100" />
                                       <p className="text-sm text-gray-300 italic px-4 leading-relaxed font-hand">
                                           {user.bio}
                                       </p>
                                       <Quote size={12} className="absolute bottom-3 right-3 text-gray-600" />
                                   </div>
                               )}

                               {/* CONTACT LINK */}
                               {user.socialLink && (
                                   <div className="mt-4 pt-4 border-t border-white/5">
                                       <a 
                                        href={user.socialLink} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all"
                                       >
                                           <LinkIcon size={12} /> Kết nối với tôi
                                       </a>
                                   </div>
                               )}
                               
                               <div className="grid grid-cols-2 gap-3 text-left mt-6 pt-4 border-t border-white/5">
                                   <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                       <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tổng giờ học</p>
                                       <p className="text-lg md:text-xl font-bold text-white flex items-baseline gap-1">
                                           {userHistory.reduce((acc, curr) => acc + curr.durationMinutes, 0)} <span className="text-[10px] font-normal text-gray-400">phút</span>
                                       </p>
                                   </div>
                                   <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                       <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Số buổi</p>
                                       <p className="text-lg md:text-xl font-bold text-white">{userHistory.length}</p>
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* History List */}
                       <div className="md:col-span-2">
                           <div className="flex items-center gap-2 mb-4">
                               <History className={theme.text} size={18} />
                               <h3 className="text-lg font-bold text-white">Lịch sử rèn luyện</h3>
                           </div>
                           
                           <div className="space-y-3 relative">
                               {/* Timeline line */}
                               <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-gray-800 z-0"></div>

                               {userHistory.map((log) => (
                                   <div key={log.id} className="relative z-10 pl-9 group">
                                       {/* Timeline Dot */}
                                       <div className={`absolute left-[10px] top-4 w-2.5 h-2.5 rounded-full border-2 border-[#0f0c29] ${log.isCompleted ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                       
                                       <div className="hover-shine glass-panel p-4 rounded-xl border border-white/5 hover:border-white/20 transition-all relative">
                                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                               <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 ${SUBJECT_CONFIG[log.subject]?.color}`}>
                                                        {SUBJECT_CONFIG[log.subject]?.icon} {log.subject}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                                                        {new Date(log.timestamp).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}
                                                        {' • '}
                                                        {new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                                    </span>
                                               </div>
                                               <div className="flex items-center gap-3">
                                                   {log.isCompleted ? (
                                                       <span className="text-[10px] font-bold text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Đạt</span>
                                                   ) : (
                                                       <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1"><AlertCircle size={12} /> Miss</span>
                                                   )}
                                                   
                                                   {/* DELETE BUTTON */}
                                                   <button 
                                                      onClick={() => handleDeleteLog(log.id)}
                                                      className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                                      title="Xóa lịch sử này"
                                                   >
                                                      <Trash2 size={12} />
                                                   </button>
                                               </div>
                                           </div>
                                           
                                           <div className="flex items-baseline gap-1 mb-1">
                                               <span className="text-xl font-bold text-white">{log.durationMinutes}</span>
                                               <span className="text-xs text-gray-500">/ {log.targetMinutes} phút</span>
                                           </div>

                                           {log.notes && (
                                               <div className="mt-2 pt-2 border-t border-white/5 text-xs text-gray-400 italic">
                                                   "{log.notes}"
                                               </div>
                                           )}
                                       </div>
                                   </div>
                               ))}

                               {userHistory.length === 0 && (
                                   <div className="pl-10 py-10">
                                       <p className="text-gray-500 text-sm">Bạn chưa có buổi học nào. Hãy bắt đầu ngay!</p>
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>
               ) : (
                   <div className="text-center py-20 text-gray-500">
                       Vui lòng đăng nhập để xem hồ sơ cá nhân.
                   </div>
               )}
           </div>
       )}
    </div>
  );
};

export default StudyTracker;