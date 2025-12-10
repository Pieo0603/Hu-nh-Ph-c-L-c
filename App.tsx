import React, { useState, useEffect } from 'react';
import StarBackground from './components/StarBackground';
import Countdown from './components/Countdown';
import MessageForm from './components/MessageForm';
import MessageList from './components/MessageList';
import MusicPlayer from './components/MusicPlayer';
import AdminDashboard from './components/AdminDashboard';
import StudyTracker from './components/StudyTracker'; // This is now conceptually the "Timer"
import EnglishHub from './components/EnglishHub'; // New English Learning Component
import MusicTab from './components/MusicTab';
import { Message, ThemeConfig, AppUser } from './types';
import { Settings, Home, Palette, Music, Timer, BrainCircuit, LogOut, LogIn, User as UserIcon, X, ArrowRight } from 'lucide-react';

// Firebase imports
import { db, auth, googleProvider } from './services/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

// Use a fixed date for THPT 2026 (Approximately late June)
const EXAM_DATE = new Date('2026-06-27T07:30:00');

// Theme Definitions
const THEMES: Record<string, ThemeConfig> = {
  blue: {
    id: 'blue',
    hex: '#3b82f6', // blue-500
    text: 'text-cyan-400',
    textDim: 'text-cyan-400/50',
    border: 'border-cyan-500',
    shadow: 'shadow-cyan-500/50', // Tăng độ đậm shadow
    gradientTitle: 'from-cyan-400 via-blue-400 to-indigo-400',
    buttonGradient: 'from-cyan-500 to-blue-600',
    icon: 'text-cyan-400',
    inputFocus: 'focus:border-cyan-500 focus:ring-cyan-500'
  },
  green: {
    id: 'green',
    hex: '#10b981', // emerald-500
    text: 'text-emerald-400',
    textDim: 'text-emerald-400/50',
    border: 'border-emerald-500',
    shadow: 'shadow-emerald-500/50',
    gradientTitle: 'from-emerald-400 via-green-400 to-lime-400',
    buttonGradient: 'from-emerald-500 to-green-600',
    icon: 'text-emerald-400',
    inputFocus: 'focus:border-emerald-500 focus:ring-emerald-500'
  },
  gray: {
    id: 'gray',
    hex: '#94a3b8', // slate-400
    text: 'text-gray-300',
    textDim: 'text-gray-400/50',
    border: 'border-gray-500',
    shadow: 'shadow-white/20',
    gradientTitle: 'from-gray-200 via-slate-400 to-zinc-400',
    buttonGradient: 'from-gray-500 to-slate-600',
    icon: 'text-gray-300',
    inputFocus: 'focus:border-gray-500 focus:ring-gray-500'
  },
  pink: {
    id: 'pink',
    hex: '#ec4899', // pink-500
    text: 'text-pink-400',
    textDim: 'text-pink-400/50',
    border: 'border-pink-500',
    shadow: 'shadow-pink-500/50',
    gradientTitle: 'from-pink-400 via-purple-400 to-indigo-400',
    buttonGradient: 'from-orange-400 to-pink-500',
    icon: 'text-pink-400',
    inputFocus: 'focus:border-pink-500 focus:ring-pink-500'
  },
  gold: {
    id: 'gold',
    hex: '#f59e0b', // amber-500
    text: 'text-amber-400',
    textDim: 'text-amber-400/50',
    border: 'border-amber-500',
    shadow: 'shadow-amber-500/50',
    gradientTitle: 'from-amber-300 via-yellow-400 to-orange-400',
    buttonGradient: 'from-amber-500 to-orange-600',
    icon: 'text-amber-400',
    inputFocus: 'focus:border-amber-500 focus:ring-amber-500'
  }
};

type Tab = 'home' | 'timer' | 'learning' | 'music';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(THEMES.pink);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  // Auth State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<AppUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState('');

  // YouTube State
  const [youtubeVideo, setYoutubeVideo] = useState<{id: string, title: string, channel: string, cover: string} | null>(null);

  // Tính toán user cuối cùng (Ưu tiên Firebase user, nếu không có thì dùng Guest)
  const currentUser: AppUser | null = firebaseUser 
    ? { uid: firebaseUser.uid, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, isAnonymous: false }
    : guestUser;

  // Listen for realtime updates from Firebase (Messages)
  useEffect(() => {
    try {
        const q = query(collection(db, "wishes"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Message[];
          setMessages(msgs);
        }, (error) => {
            console.error("Lỗi khi đọc dữ liệu Firebase:", error);
        });
        return () => unsubscribe();
    } catch (e) {
        console.error("Lỗi khởi tạo Firebase:", e);
    }
  }, []);

  // Listen for Auth Changes (Firebase)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
       setFirebaseUser(user);
       if (user) {
         setGuestUser(null); // Clear guest if logged in real
         setShowLoginModal(false);
       }
    });
    return () => unsubscribe();
  }, []);

  const handleGlobalLoginGoogle = async () => {
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (e) {
          console.error("Login failed", e);
      }
  };

  const handleGlobalLoginGuest = (e: React.FormEvent) => {
      e.preventDefault();
      if (!guestNameInput.trim()) return;
      const newGuest: AppUser = {
          uid: 'guest-' + Date.now(),
          displayName: guestNameInput,
          photoURL: `https://api.dicebear.com/7.x/notionists/svg?seed=${guestNameInput}`,
          isAnonymous: true
      };
      setGuestUser(newGuest);
      setShowLoginModal(false);
  };

  const handleGlobalLogout = async () => {
      if (firebaseUser) {
          await signOut(auth);
      }
      setGuestUser(null);
      setFirebaseUser(null);
  };

  const handleAddMessage = async (newMsg: Omit<Message, 'id' | 'timestamp'>) => {
      await addDoc(collection(db, "wishes"), {
        ...newMsg,
        timestamp: Date.now()
      });
  };

  const handleDeleteMessages = async (idsToDelete: string[]) => {
      try {
        const batch = writeBatch(db);
        idsToDelete.forEach(id => {
            const docRef = doc(db, "wishes", id);
            batch.delete(docRef);
        });
        await batch.commit();
      } catch (error) {
        console.error("Error deleting documents: ", error);
        alert("Có lỗi khi xóa tin nhắn.");
      }
  };

  const handleSelectVideo = (videoId: string, title: string, channel: string, thumbnail: string) => {
     setYoutubeVideo({ id: videoId, title, channel, cover: thumbnail });
  };

  return (
    <div className="min-h-screen text-white relative flex flex-col items-center">
      <StarBackground />
      
      {/* HEADER / NAVIGATION BAR */}
      {!showAdmin && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-b from-[#0f0c29] to-transparent backdrop-blur-[2px] flex justify-between items-start">
           
           {/* LEFT: USER AUTH INFO */}
           <div className="flex items-center">
              {currentUser ? (
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md hover:bg-white/20 transition-all cursor-pointer group shadow-lg" onClick={() => setActiveTab('timer')}>
                       <img 
                          src={currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.displayName}`} 
                          alt="Avt"
                          className="w-6 h-6 rounded-full border border-white/30" 
                       />
                       <span className="text-xs font-bold text-white max-w-[80px] sm:max-w-[120px] truncate hidden sm:block">
                          {currentUser.displayName}
                       </span>
                       <button 
                          onClick={(e) => { e.stopPropagation(); handleGlobalLogout(); }} 
                          className="p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors ml-1" 
                          title="Đăng xuất"
                       >
                          <LogOut size={12} />
                       </button>
                  </div>
              ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)} 
                    className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md hover:bg-white text-gray-200 hover:text-black transition-all text-xs font-bold shadow-lg group"
                  >
                      <LogIn size={14} className="group-hover:text-black" />
                      <span>Đăng nhập</span>
                  </button>
              )}
           </div>

           {/* CENTER: TABS */}
           <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-1 bg-black/60 backdrop-blur-xl p-1 rounded-full border border-white/10 shadow-2xl">
              <button 
                onClick={() => setActiveTab('home')}
                className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-full transition-all duration-300 text-xs md:text-sm font-bold ${activeTab === 'home' ? `bg-white text-black shadow-lg` : 'text-gray-400 hover:text-white'}`}
              >
                <Home size={14} />
                <span className="hidden md:inline">Trang chủ</span>
              </button>
              <button 
                onClick={() => setActiveTab('timer')}
                className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-full transition-all duration-300 text-xs md:text-sm font-bold ${activeTab === 'timer' ? `bg-white text-black shadow-lg` : 'text-gray-400 hover:text-white'}`}
              >
                <Timer size={14} />
                <span className="hidden md:inline">Hẹn giờ</span>
              </button>
              <button 
                onClick={() => setActiveTab('learning')}
                className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-full transition-all duration-300 text-xs md:text-sm font-bold ${activeTab === 'learning' ? `bg-white text-black shadow-lg` : 'text-gray-400 hover:text-white'}`}
              >
                <BrainCircuit size={14} />
                <span className="hidden md:inline">Học tập</span>
              </button>
              <button 
                onClick={() => setActiveTab('music')}
                className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-full transition-all duration-300 text-xs md:text-sm font-bold ${activeTab === 'music' ? `bg-white text-black shadow-lg` : 'text-gray-400 hover:text-white'}`}
              >
                <Music size={14} />
                <span className="hidden md:inline">Nhạc</span>
              </button>
           </div>

           {/* RIGHT: THEME & ADMIN */}
           <div className="flex items-center gap-2 z-20">
              {/* Theme Trigger */}
              <div className="relative">
                <button 
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all shadow-lg"
                  title="Đổi màu giao diện"
                >
                  <Palette size={18} />
                </button>
                
                {/* Collapsible Theme Picker */}
                {showThemePicker && (
                  <div className="absolute top-full right-0 mt-2 glass-panel p-2 rounded-2xl flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200 items-center border border-white/20 shadow-2xl bg-[#0f0c29]/90">
                    {Object.values(THEMES).map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => { setCurrentTheme(theme); setShowThemePicker(false); }}
                        className={`w-6 h-6 rounded-full transition-all duration-300 relative border border-white/20 ${
                          currentTheme.id === theme.id ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: theme.hex }}
                        title={theme.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Button */}
              <button 
                  onClick={() => setShowAdmin(true)} 
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all shadow-lg"
                  title="Cài đặt Admin"
              >
                  <Settings size={18} />
              </button>
           </div>
        </div>
      )}

      {/* LOGIN MODAL (GOOGLE OR GUEST) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`relative bg-[#1e1e2e] rounded-3xl w-full max-w-md overflow-hidden border border-white/10 shadow-2xl transform scale-100`}>
                <button 
                    onClick={() => setShowLoginModal(false)}
                    className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                >
                    <X size={20} />
                </button>
                
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                            <UserIcon size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Chào mừng sĩ tử!</h3>
                        <p className="text-gray-400 text-sm">Chọn cách đăng nhập để lưu thành tích học tập</p>
                    </div>

                    <div className="space-y-4">
                        {/* Option 1: Google */}
                        <button 
                            onClick={handleGlobalLoginGoogle}
                            className="w-full py-4 rounded-xl bg-white text-gray-900 font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-lg group relative overflow-hidden"
                        >
                            <span className="font-extrabold text-blue-600">G</span>
                            <span>Đăng nhập bằng Google</span>
                            <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                                <ArrowRight size={16} />
                            </div>
                        </button>
                        
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-gray-700"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase">Hoặc dùng tên tạm</span>
                            <div className="flex-grow border-t border-gray-700"></div>
                        </div>

                        {/* Option 2: Guest Form */}
                        <form onSubmit={handleGlobalLoginGuest} className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tên hiển thị</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={guestNameInput}
                                    onChange={(e) => setGuestNameInput(e.target.value)}
                                    placeholder="VD: Quyết tâm 28đ"
                                    className="flex-grow bg-black/30 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/50 text-sm transition-colors"
                                />
                                <button 
                                    type="submit"
                                    disabled={!guestNameInput.trim()}
                                    className={`px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Vào
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 italic">* Tài khoản khách chỉ lưu dữ liệu trên thiết bị này.</p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Main Admin Dashboard Overlay */}
      {showAdmin && (
          <AdminDashboard 
            messages={messages} 
            onDeleteMessages={handleDeleteMessages} 
            onClose={() => setShowAdmin(false)}
            theme={currentTheme}
          />
      )}

      <div className={`w-full ${showAdmin ? 'hidden' : ''}`}>
        
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-500 pb-24">
            {/* 
                UPDATED: margin-top changed from mt-44 to mt-28 (mobile) and mt-40 (desktop) 
                to move the text up slightly but keep it safe from navbar.
            */}
            <header className="mt-28 md:mt-40 text-center px-4 z-10">
                <h1 className={`text-2xl md:text-5xl font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientTitle} mb-3 drop-shadow-lg transition-all duration-500 leading-normal py-4`}>
                ĐẾM NGƯỢC ĐẾN NGÀY THI <br className="md:hidden" /> THPT QUỐC GIA 2026
                </h1>
                <p className="text-gray-400 text-xs md:text-base font-light max-w-lg mx-auto">
                "Hành trình vạn dặm bắt đầu từ một bước chân." <br/> Cùng nhau nỗ lực nhé!
                </p>
            </header>

            <main className="w-full max-w-7xl px-4 z-10 flex flex-col items-center mx-auto">
                <Countdown targetDate={EXAM_DATE} theme={currentTheme} />
                <MessageForm onAddMessage={handleAddMessage} theme={currentTheme} />
                <MessageList messages={messages} theme={currentTheme} />
            </main>
            
            <footer className="w-full text-center py-6 text-[10px] text-gray-600 z-10">
              <p>Made with  Huỳnh Phước Lộc❤️ for 2k8</p>
           </footer>
          </div>
        )}

        {/* TAB 2: TIMER (Study Tracker) */}
        {activeTab === 'timer' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-20 pb-24">
               {/* Pass current user (Google or Guest) to StudyTracker */}
               <StudyTracker theme={currentTheme} user={currentUser} />
           </div>
        )}

        {/* TAB 3: ENGLISH LEARNING HUB */}
        {activeTab === 'learning' && (
           <EnglishHub theme={currentTheme} user={currentUser} />
        )}

         {/* TAB 4: MUSIC SEARCH */}
         {activeTab === 'music' && (
           <MusicTab theme={currentTheme} onSelectVideo={handleSelectVideo} />
        )}

        <MusicPlayer theme={currentTheme} youtubeVideo={youtubeVideo} />
      </div>
    </div>
  );
};

export default App;