import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { StudyLog, ThemeConfig, LeaderboardEntry, AppUser } from '../types';
import { Play, Pause, Square, CheckCircle, Clock, BookOpen, LogOut, LayoutList, Trophy, User as UserIcon, AlertCircle, ArrowRight, History, Lock, Trash2 } from 'lucide-react';

interface StudyTrackerProps {
  theme: ThemeConfig;
  user: AppUser | null; // Receive user from App
}

const SUBJECTS = [
  "Toán", "Văn", "Anh", "Lý", "Hóa", "Sinh", "Sử", "Địa", "KTPL", "CNTT"
];

const MOTIVATIONAL_QUOTES = [
    "Không có áp lực, không có kim cương. 💎",
    "Tương lai khóc hay cười phụ thuộc vào độ lười của quá khứ.",
    "Mỗi trang sách là một bước chân đến thành công.",
    "Thà đổ mồ hôi trên trang sách còn hơn rơi nước mắt lúc làm bài.",
    "Đừng cúi đầu, vương miện sẽ rơi. 👑",
    "Học không chơi đánh rơi tuổi trẻ, chơi không học bán rẻ tương lai.",
    "Cố gắng thêm chút nữa, Đại học đang vẫy gọi!",
    "Chỉ cần bạn không dừng lại, việc bạn tiến chậm thế nào không quan trọng.",
    "Giấc mơ không tốn phí, nhưng thực hiện nó thì tốn rất nhiều nỗ lực.",
    "Đau khổ của kỷ luật nhẹ tựa lông hồng, đau khổ của hối hận nặng tựa thái sơn."
];

type TabView = 'timer' | 'leaderboard' | 'profile';

const StudyTracker: React.FC<StudyTrackerProps> = ({ theme, user }) => {
  const [activeTab, setActiveTab] = useState<TabView>('timer');
  
  // Data States
  const [logs, setLogs] = useState<StudyLog[]>([]); // Recent global logs
  const [userHistory, setUserHistory] = useState<StudyLog[]>([]); // Specific user history
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0); 
  const [startTimeStr, setStartTimeStr] = useState<string>("");
  const [endTimeStr, setEndTimeStr] = useState<string>("");
  const [currentQuote, setCurrentQuote] = useState<string>("");

  // Form State
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [targetMinutes, setTargetMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);

  // 1. Fetch Recent Logs (for "Realtime" list) & Leaderboard Calculation
  useEffect(() => {
    try {
        const q = query(collection(db, "study_logs"), orderBy("timestamp", "desc"), limit(200));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedLogs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as StudyLog[];
          
          setLogs(fetchedLogs); // Updates the "Realtime" list

          // Calculate Leaderboard Client-Side
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
           console.error("Lỗi tải nhật ký học tập:", error);
        });
        return () => unsubscribe();
    } catch (e) {
        console.error("Lỗi khởi tạo listener:", e);
    }
  }, []);

  // 2. Fetch User History when switching to Profile tab
  useEffect(() => {
    if (activeTab === 'profile' && user) {
        const fetchHistory = async () => {
             try {
                // Let's try correct query. If index missing, console will log link.
                const q = query(
                    collection(db, "study_logs"), 
                    where("userId", "==", user.uid), 
                    orderBy("timestamp", "desc"),
                    limit(50)
                );
                
                const snapshot = await getDocs(q);
                const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudyLog[];
                setUserHistory(history);
             } catch (e: any) {
                 console.log("Fetching history error (likely missing index), falling back to recent logs filter", e);
                 // Fallback: Filter from the globally fetched `logs`
                 const myLogs = logs.filter(l => l.userId === user.uid);
                 setUserHistory(myLogs);
             }
        };
        fetchHistory();
    }
  }, [activeTab, user, logs]);

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

  const startSession = () => {
    if (!user) {
      alert("Bạn chưa đăng nhập! Vui lòng bấm nút 'Đăng nhập' ở góc trên bên trái màn hình.");
      return;
    }
    if (targetMinutes <= 0) {
        alert("Thời gian mục tiêu phải lớn hơn 0 phút!");
        return;
    }
    const now = new Date();
    setStartTimeStr(now.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}));
    const end = new Date(now.getTime() + targetMinutes * 60000);
    setEndTimeStr(end.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}));
    setCurrentQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
    setIsSessionActive(true);
    setIsTimerRunning(true);
    setElapsedSeconds(0);
  };

  const finishSession = async () => {
    if (!user) return;
    setIsTimerRunning(false);
    const durationMinutes = Math.floor(elapsedSeconds / 60);
    try {
        await addDoc(collection(db, "study_logs"), {
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
        alert("Đã lưu thành tích lên bảng vàng! 🏆");
        // Switch to profile or leaderboard to see result
        setActiveTab('profile');
    } catch (e: any) {
        console.error("Error saving log", e);
        setIsSessionActive(false);
        alert("Lỗi lưu dữ liệu. Kiểm tra kết nối mạng.");
    }
  };

  const handleDeleteLog = async (logId: string) => {
      if (!window.confirm("Bạn có chắc chắn muốn xóa bản ghi thời gian này không?")) return;
      
      try {
          await deleteDoc(doc(db, "study_logs", logId));
          // Update local state immediately for better UX
          setUserHistory(prev => prev.filter(log => log.id !== logId));
          // Optional: Update global logs if needed, though they update via onSnapshot
      } catch (e) {
          console.error("Error deleting log:", e);
          alert("Lỗi khi xóa. Vui lòng thử lại.");
      }
  };

  // --- FLIP CARD ANIMATION COMPONENT ---
  const FlipCard = ({ value, label }: { value: number, label?: string }) => {
      const valStr = value < 10 ? `0${value}` : `${value}`;
      
      return (
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-32 md:w-40 md:h-56 lg:w-48 lg:h-64 bg-[#111] rounded-lg perspective shadow-2xl border border-white/10 group">
                {/* Static Background Number */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-heading text-6xl md:text-8xl lg:text-9xl font-bold text-[#333]">
                        {valStr}
                    </span>
                </div>
                
                {/* Top Half */}
                <div className="absolute inset-0 h-1/2 overflow-hidden bg-[#1e1e1e] rounded-t-lg border-b border-black z-10 flex items-end justify-center">
                    <span className="font-heading text-6xl md:text-8xl lg:text-9xl font-bold text-white translate-y-1/2">
                        {valStr}
                    </span>
                </div>
                
                {/* Bottom Half */}
                <div className="absolute top-1/2 inset-x-0 bottom-0 overflow-hidden bg-[#1a1a1a] rounded-b-lg border-t border-black/50 z-10 flex items-start justify-center shadow-inner">
                    <span className="font-heading text-6xl md:text-8xl lg:text-9xl font-bold text-white -translate-y-1/2">
                        {valStr}
                    </span>
                </div>
                
                {/* Flip Line */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black z-20 shadow-sm"></div>
                
                {/* Screw Heads decoration */}
                <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-[#444] rounded-full shadow-inner z-20"></div>
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#444] rounded-full shadow-inner z-20"></div>
                <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-[#444] rounded-full shadow-inner z-20"></div>
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-[#444] rounded-full shadow-inner z-20"></div>
            </div>
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
      
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      return (
          <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center text-white overflow-hidden">
              <div className="flex flex-col items-center gap-2 mb-4 md:mb-8 animate-in slide-in-from-top-10 duration-700">
                  <span className="text-xs md:text-sm font-bold tracking-[0.3em] text-gray-500 uppercase">ĐANG HỌC</span>
                  <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/20 bg-white/5">
                      <BookOpen size={18} className={theme.text} />
                      <span className="text-xl md:text-3xl font-bold text-white uppercase tracking-wider">{subject}</span>
                  </div>
              </div>
              
              {/* FLIP CLOCK CONTAINER */}
              <div className="flex justify-center items-center gap-2 md:gap-4 mb-8 md:mb-12 scale-75 md:scale-90 lg:scale-100 origin-center">
                  <FlipCard value={hours} label="Giờ" />
                  <div className="flex flex-col gap-2 md:gap-4 opacity-50 pt-4">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#555]"></div>
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#555]"></div>
                  </div>
                  <FlipCard value={minutes} label="Phút" />
                  <div className="flex flex-col gap-2 md:gap-4 opacity-50 pt-4">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#555]"></div>
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#555]"></div>
                  </div>
                  <FlipCard value={seconds} label="Giây" />
              </div>

              <div className="w-full max-w-2xl px-6 flex flex-col items-center gap-6">
                  <div className="flex w-full justify-between px-8 md:px-20 text-gray-400 font-mono text-xs md:text-sm border-t border-white/10 pt-4">
                      <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] uppercase tracking-widest opacity-50">Bắt đầu</span>
                          <span className="text-white font-bold">{startTimeStr}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] uppercase tracking-widest opacity-50">Kết thúc</span>
                          <span className={`font-bold ${remainingSeconds === 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                              {endTimeStr}
                          </span>
                      </div>
                  </div>
                  <div className="text-center max-w-xl h-10 px-4">
                      <p className="text-white/80 text-sm md:text-lg font-hand transition-opacity duration-1000 line-clamp-2">"{currentQuote}"</p>
                  </div>
                  
                  {/* Smaller Controls - Updated size w-16 h-16 to fit PC screens better */}
                  <div className="flex justify-center gap-6 mt-2">
                      {!isTimerRunning ? (
                          remainingSeconds > 0 && (
                            <button onClick={() => setIsTimerRunning(true)} className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-black border-2 flex items-center justify-center text-white shadow-lg transition-all transform hover:scale-110 ${theme.border} group`}>
                                <Play size={24} fill="white" className={`${theme.text} group-hover:fill-current`} />
                            </button>
                          )
                      ) : (
                          <button onClick={() => setIsTimerRunning(false)} className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black border-2 border-yellow-600 flex items-center justify-center text-white shadow-lg transition-all transform hover:scale-110 group">
                             <Pause size={24} fill="white" className="text-yellow-500 group-hover:fill-current" />
                          </button>
                      )}
                      <button onClick={finishSession} className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black border-2 border-red-600 flex items-center justify-center text-white shadow-lg transition-all transform hover:scale-110 group">
                         <Square size={20} fill="white" className="text-red-500 group-hover:fill-current" />
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // ----------------------------------------------------------------------
  // MAIN APP VIEW (LOGGED IN or NOT - CONTENT ALWAYS VISIBLE)
  // ----------------------------------------------------------------------
  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-10">
       
       {/* USER GREETING & HEADER (More Compact) */}
       {user ? (
           <div className="flex justify-between items-center mb-6 animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-3">
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} alt="User" className="w-10 h-10 rounded-full border border-white/20" />
                        <div>
                            <h3 className="text-base font-bold text-white leading-tight">{user.displayName}</h3>
                            <p className={`text-[10px] uppercase font-bold tracking-wider ${theme.text}`}>Chiến binh 2026</p>
                        </div>
                </div>
                {/* Logout is handled in App.tsx Header now, but we can keep a note or leave blank */}
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

       {/* SUB-TABS (Clean segmented control) */}
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
                          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                             {SUBJECTS.map(sub => (
                                <button key={sub} onClick={() => setSubject(sub)} className={`py-2.5 rounded-lg text-sm font-medium transition-all ${subject === sub ? `bg-gradient-to-r ${theme.buttonGradient} text-white shadow-lg` : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                   {sub}
                                </button>
                             ))}
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wider">Thời gian: {targetMinutes} phút</label>
                          <div className="flex items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                              <span className="text-xs text-gray-400">5p</span>
                              <input 
                                type="range" 
                                min="5" max="180" step="5" 
                                value={targetMinutes} 
                                onChange={(e) => setTargetMinutes(parseInt(e.target.value))} 
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white touch-none" 
                              />
                              <span className="text-xs text-gray-400">180p</span>
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wider">Mục tiêu hôm nay</label>
                          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="VD: Giải hết đề Toán 2024..." className="w-full bg-black/20 border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/50 resize-none h-20" />
                       </div>
                       
                       {/* START BUTTON with Auth Check */}
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
                           <img src={log.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${log.userName}`} alt="avt" className="w-9 h-9 rounded-full border border-gray-600" />
                           <div className="flex-grow min-w-0">
                               <div className="flex justify-between items-baseline">
                                  <span className={`font-bold text-sm truncate pr-2 ${user && log.userId === user.uid ? theme.text : 'text-white'}`}>{log.userName}</span>
                                  <span className="text-[10px] text-gray-500 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                               </div>
                               <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 truncate">
                                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-medium">{log.subject}</span>
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

       {/* 2. LEADERBOARD TAB (Optimized for Mobile) */}
       {activeTab === 'leaderboard' && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="text-center mb-6 md:mb-10">
                   <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 mb-1 uppercase tracking-widest">Bảng Xếp Hạng</h2>
                   <p className="text-xs text-gray-400">Dựa trên tổng thời gian học tập chăm chỉ</p>
               </div>

               {/* Top 3 Podium: Flexbox for mobile side-by-side scaling */}
               <div className="flex justify-center items-end gap-2 md:gap-6 mb-8 px-2">
                   {/* Rank 2 */}
                   {leaderboard[1] && (
                       <div className="hover-shine w-1/3 max-w-[140px] bg-[#1a1a1a] rounded-t-xl p-2 md:p-6 flex flex-col items-center border-t-2 md:border-t-4 border-gray-400 relative">
                           <div className="absolute -top-3 md:-top-5 w-6 h-6 md:w-10 md:h-10 bg-gray-400 rounded-full flex items-center justify-center font-bold text-black shadow-lg text-xs md:text-base">2</div>
                           <img src={leaderboard[1].userAvatar} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-4 border-gray-400 mb-2 md:mb-3 object-cover" alt="Top 2" />
                           <h3 className="font-bold text-xs md:text-lg text-gray-200 line-clamp-1 w-full text-center">{leaderboard[1].userName}</h3>
                           <p className="text-gray-500 text-[10px] md:text-sm mb-1">{leaderboard[1].sessionsCount} buổi</p>
                           <div className="bg-gray-800 px-2 py-0.5 md:px-4 md:py-1 rounded-full text-white font-mono font-bold text-[10px] md:text-sm">{leaderboard[1].totalMinutes}p</div>
                       </div>
                   )}
                   {/* Rank 1 (Big) */}
                   {leaderboard[0] && (
                       <div className="hover-shine w-1/3 max-w-[160px] bg-[#222] rounded-t-xl p-3 md:p-8 flex flex-col items-center border-t-4 border-yellow-400 pb-8 md:pb-10 shadow-2xl shadow-yellow-500/10 z-10 relative -top-4 md:-top-0">
                           <div className="absolute -top-4 md:-top-6 w-8 h-8 md:w-12 md:h-12 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-black shadow-lg text-sm md:text-xl">1</div>
                           <Trophy className="text-yellow-400 mb-1 md:mb-2 w-4 h-4 md:w-8 md:h-8" />
                           <img src={leaderboard[0].userAvatar} className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 md:border-4 border-yellow-400 mb-2 md:mb-4 object-cover" alt="Top 1" />
                           <h3 className="font-bold text-xs md:text-xl text-white line-clamp-1 w-full text-center">{leaderboard[0].userName}</h3>
                           <div className="mt-2 bg-gradient-to-r from-yellow-600 to-orange-600 px-3 py-1 md:px-6 md:py-2 rounded-full text-white font-mono font-bold text-xs md:text-lg shadow-lg">{leaderboard[0].totalMinutes}p</div>
                       </div>
                   )}
                   {/* Rank 3 */}
                   {leaderboard[2] && (
                       <div className="hover-shine w-1/3 max-w-[140px] bg-[#1a1a1a] rounded-t-xl p-2 md:p-6 flex flex-col items-center border-t-2 md:border-t-4 border-orange-700 relative">
                           <div className="absolute -top-3 md:-top-5 w-6 h-6 md:w-10 md:h-10 bg-orange-700 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-xs md:text-base">3</div>
                           <img src={leaderboard[2].userAvatar} className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-4 border-orange-700 mb-2 md:mb-3 object-cover" alt="Top 3" />
                           <h3 className="font-bold text-xs md:text-lg text-orange-200 line-clamp-1 w-full text-center">{leaderboard[2].userName}</h3>
                           <p className="text-gray-500 text-[10px] md:text-sm mb-1">{leaderboard[2].sessionsCount} buổi</p>
                           <div className="bg-gray-800 px-2 py-0.5 md:px-4 md:py-1 rounded-full text-white font-mono font-bold text-[10px] md:text-sm">{leaderboard[2].totalMinutes}p</div>
                       </div>
                   )}
               </div>

               {/* List Ranks 4+ */}
               <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5">
                   {leaderboard.slice(3).map((user, idx) => (
                       <div key={user.userId} className="hover-shine flex items-center p-3 md:p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                           <div className="w-8 text-center font-bold text-gray-600 text-sm">#{idx + 4}</div>
                           <img src={user.userAvatar} className="w-8 h-8 md:w-10 md:h-10 rounded-full mx-3" alt="User" />
                           <div className="flex-grow">
                               <h4 className="font-bold text-gray-300 text-sm">{user.userName}</h4>
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
                                    <img src={user.photoURL || ""} className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white/10" alt="Me" />
                                    <div className="absolute bottom-0 right-0 bg-green-500 w-5 h-5 rounded-full border-2 border-black"></div>
                               </div>
                               <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{user.displayName}</h2>
                               
                               <div className="grid grid-cols-2 gap-3 text-left mt-6">
                                   <div className="bg-white/5 p-3 rounded-xl">
                                       <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tổng giờ học</p>
                                       <p className="text-lg md:text-xl font-bold text-white flex items-baseline gap-1">
                                           {userHistory.reduce((acc, curr) => acc + curr.durationMinutes, 0)} <span className="text-[10px] font-normal text-gray-400">phút</span>
                                       </p>
                                   </div>
                                   <div className="bg-white/5 p-3 rounded-xl">
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
                                                    <span className="bg-white/10 text-[10px] font-bold px-2 py-0.5 rounded text-gray-300">{log.subject}</span>
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