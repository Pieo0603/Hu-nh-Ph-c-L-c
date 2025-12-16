import React, { useState, useEffect } from 'react';
import StarBackground from './components/StarBackground';
import Countdown from './components/Countdown';
import MessageForm from './components/MessageForm';
import MessageList from './components/MessageList';
import MusicPlayer from './components/MusicPlayer';
import AdminDashboard from './components/AdminDashboard';
import StudyTracker from './components/StudyTracker';
import EnglishHub from './components/EnglishHub';
import MusicTab from './components/MusicTab';
import AiAssistant from './components/AiAssistant';
import UserProfileModal from './components/UserProfileModal';
import { Message, ThemeConfig, AppUser } from './types';
import { Settings, Home, Palette, Music, Timer, LogOut, LogIn, User as UserIcon, X, ArrowRight, Edit3, Camera, Link as LinkIcon, GraduationCap, FileText, RotateCw, PenTool, BookOpen, Sparkles } from 'lucide-react';
import firebase from 'firebase/compat/app';
import { db, auth, googleProvider } from './services/firebase';

// Use a fixed date for THPT 2026
const EXAM_DATE = new Date('2026-06-27T07:30:00');

// Theme Definitions
const THEMES: Record<string, ThemeConfig> = {
  blue: {
    id: 'blue',
    hex: '#3b82f6',
    text: 'text-cyan-400',
    textDim: 'text-cyan-400/50',
    border: 'border-cyan-500',
    shadow: 'shadow-cyan-500/50',
    gradientTitle: 'from-cyan-400 via-blue-400 to-indigo-400',
    buttonGradient: 'from-cyan-500 to-blue-600',
    icon: 'text-cyan-400',
    inputFocus: 'focus:border-cyan-500 focus:ring-cyan-500'
  },
  green: {
    id: 'green',
    hex: '#10b981',
    text: 'text-emerald-400',
    textDim: 'text-emerald-400/50',
    border: 'border-emerald-500',
    shadow: 'shadow-emerald-500/50',
    gradientTitle: 'from-emerald-400 via-green-400 to-lime-400',
    buttonGradient: 'from-emerald-500 to-green-600',
    icon: 'text-emerald-400',
    inputFocus: 'focus:border-emerald-500 focus:ring-emerald-500'
  },
  pink: {
    id: 'pink',
    hex: '#ec4899',
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
    hex: '#f59e0b',
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
  
  // Learning Tab Sub-State
  const [learningSubject, setLearningSubject] = useState<'menu' | 'english'>('menu');

  // Auth State
  const [firebaseUser, setFirebaseUser] = useState<firebase.User | null>(null);
  const [userExtras, setUserExtras] = useState<Partial<AppUser>>({});
  const [guestUser, setGuestUser] = useState<AppUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState('');

  // Edit Profile State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarSeed, setEditAvatarSeed] = useState('');
  const [editCustomAvatar, setEditCustomAvatar] = useState<string | null>(null);
  const [editBio, setEditBio] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editSocial, setEditSocial] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // View Other User Profile State
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // YouTube State
  const [youtubeVideo, setYoutubeVideo] = useState<{id: string, title: string, channel: string, cover: string} | null>(null);
  
  // Scroll State for Floating Button
  const [showScrollButton, setShowScrollButton] = useState(false);

  const currentUser: AppUser | null = firebaseUser 
    ? { 
        uid: firebaseUser.uid, 
        displayName: firebaseUser.displayName, 
        photoURL: userExtras.photoURL || firebaseUser.photoURL,
        isAnonymous: false,
        bio: userExtras.bio,
        className: userExtras.className,
        socialLink: userExtras.socialLink,
        isPremium: userExtras.isPremium
      }
    : guestUser;

  // Listen for realtime updates from Firebase (Messages)
  useEffect(() => {
    try {
        const unsubscribe = db.collection("wishes")
          .orderBy("timestamp", "desc")
          .onSnapshot((snapshot) => {
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

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500 && activeTab === 'home') {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  // Listen for Auth Changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
       setFirebaseUser(user);
       if (user) {
         setGuestUser(null);
         setShowLoginModal(false);
         try {
             const userUnsubscribe = db.collection('users').doc(user.uid).onSnapshot(doc => {
                 if (doc.exists) {
                     setUserExtras(doc.data() as Partial<AppUser>);
                 }
             });
             return () => userUnsubscribe();
         } catch (e) {
             console.error("Error fetching user profile:", e);
         }
       } else {
           setUserExtras({});
       }
    });
    return () => unsubscribe();
  }, []);

  const handleGlobalLoginGoogle = async () => {
      try {
          await auth.signInWithPopup(googleProvider);
      } catch (e: any) {
          console.error("Popup login failed", e);
          if (e.message === "Auth not supported") {
             alert("Trình duyệt này chặn đăng nhập Google (Cookies). Vui lòng dùng chế độ 'Dùng tên tạm' bên dưới.");
             return;
          }
          alert(`Đăng nhập thất bại. Vui lòng dùng chế độ Khách.`);
      }
  };

  const handleGlobalLoginGuest = (e: React.FormEvent) => {
      e.preventDefault();
      if (!guestNameInput.trim()) return;
      const newGuest: AppUser = {
          uid: 'guest-' + Date.now(),
          displayName: guestNameInput,
          photoURL: `https://api.dicebear.com/7.x/notionists/svg?seed=${guestNameInput}`,
          isAnonymous: true,
          bio: "Khách ghé thăm",
          className: "Tự do",
          isPremium: false
      };
      setGuestUser(newGuest);
      setShowLoginModal(false);
  };

  const handleGlobalLogout = async () => {
      if (firebaseUser) {
          await auth.signOut();
      }
      setGuestUser(null);
      setFirebaseUser(null);
      setUserExtras({});
  };

  const processAvatarImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 300; 
          let width = img.width;
          let height = img.height;

          if (width > height) {
              if (width > MAX_SIZE) {
                  height *= MAX_SIZE / width;
                  width = MAX_SIZE;
              }
          } else {
              if (height > MAX_SIZE) {
                  width *= MAX_SIZE / height;
                  height = MAX_SIZE;
              }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) {
              alert("Ảnh quá lớn (Max 5MB).");
              return;
          }
          try {
              const base64 = await processAvatarImage(file);
              setEditCustomAvatar(base64);
              setEditAvatarSeed('');
          } catch (error) {
              console.error(error);
              alert("Lỗi xử lý ảnh.");
          }
      }
  };

  const openEditProfile = () => {
    if (currentUser) {
        setEditName(currentUser.displayName || '');
        setEditBio(currentUser.bio || '');
        setEditClass(currentUser.className || '');
        setEditSocial(currentUser.socialLink || '');
        
        const currentUrl = currentUser.photoURL || '';
        if (currentUrl.includes('api.dicebear.com')) {
            const seedMatch = currentUrl.match(/seed=([^&]*)/);
            setEditAvatarSeed(seedMatch ? seedMatch[1] : (currentUser.displayName || 'user'));
            setEditCustomAvatar(null);
        } else {
            setEditCustomAvatar(currentUrl);
            setEditAvatarSeed('');
        }
        setShowEditProfile(true);
    }
  };

  const handleUpdateProfile = async () => {
      if (!firebaseUser) return; 
      if (!editName.trim()) {
          alert("Tên không được để trống!");
          return;
      }
      setIsUpdatingProfile(true);
      try {
          let finalPhotoURL = editCustomAvatar;
          if (!finalPhotoURL && editAvatarSeed) {
              finalPhotoURL = `https://api.dicebear.com/7.x/notionists/svg?seed=${editAvatarSeed}`;
          }
          if (!finalPhotoURL) finalPhotoURL = firebaseUser.photoURL || "";

          await firebaseUser.updateProfile({
              displayName: editName,
              photoURL: finalPhotoURL
          });

          const extendedData = {
              displayName: editName,
              photoURL: finalPhotoURL,
              bio: editBio,
              className: editClass,
              socialLink: editSocial,
              updatedAt: Date.now(),
              isPremium: userExtras.isPremium || false
          };
          
          await db.collection('users').doc(firebaseUser.uid).set(extendedData, { merge: true });
          setUserExtras(extendedData);
          setFirebaseUser({ ...firebaseUser, displayName: editName, photoURL: finalPhotoURL } as firebase.User);
          
          setShowEditProfile(false);
          alert("Cập nhật hồ sơ thành công!");
      } catch (error) {
          console.error("Error updating profile:", error);
          alert("Lỗi khi cập nhật hồ sơ.");
      } finally {
          setIsUpdatingProfile(false);
      }
  };

  const handleAddMessage = async (newMsg: Omit<Message, 'id' | 'timestamp'>) => {
      await db.collection("wishes").add({
        ...newMsg,
        userId: currentUser?.uid,
        timestamp: Date.now()
      });
  };

  const handleDeleteMessages = async (idsToDelete: string[]) => {
      try {
        const batch = db.batch();
        idsToDelete.forEach(id => {
            const docRef = db.collection("wishes").doc(id);
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

  const scrollToMessageForm = () => {
      const formElement = document.getElementById('message-form');
      if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const handleViewProfile = (userId: string) => {
      setViewingUserId(userId);
  };

  return (
    <div className="min-h-screen text-white relative flex flex-col items-center selection:bg-pink-500/30">
      <StarBackground />
      
      {/* HEADER / NAVIGATION BAR */}
      {!showAdmin && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-b from-[#0f0c29] to-transparent backdrop-blur-[2px] flex justify-between items-start">
           
           {/* LEFT: USER AUTH INFO */}
           <div className="flex items-center">
              {currentUser ? (
                  <div className="flex items-center gap-2 bg-white/10 pl-2 pr-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md hover:bg-white/20 transition-all cursor-pointer group shadow-lg" onClick={openEditProfile}>
                       <img 
                          src={currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.displayName}`} 
                          alt="Avt"
                          className="w-7 h-7 rounded-full border border-white/30 bg-black/20 object-cover" 
                       />
                       <span className="text-xs font-bold text-white max-w-[80px] sm:max-w-[120px] truncate hidden sm:block">
                          {currentUser.displayName}
                       </span>
                       <div className="w-[1px] h-4 bg-white/20 mx-1"></div>
                       <button 
                          onClick={(e) => { e.stopPropagation(); handleGlobalLogout(); }} 
                          className="p-1 rounded-full text-red-400 hover:text-white hover:bg-red-500/50 transition-colors" 
                          title="Đăng xuất"
                       >
                          <LogOut size={14} />
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
           <div className="absolute left-1/2 transform -translate-x-1/2 top-14 md:top-3 flex gap-1 bg-black/60 backdrop-blur-xl p-1 rounded-full border border-white/10 shadow-2xl">
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
                onClick={() => { setActiveTab('learning'); setLearningSubject('menu'); }}
                className={`flex items-center gap-2 px-3 md:px-5 py-2 rounded-full transition-all duration-300 text-xs md:text-sm font-bold ${activeTab === 'learning' ? `bg-white text-black shadow-lg` : 'text-gray-400 hover:text-white'}`}
              >
                <GraduationCap size={16} />
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
              <div className="relative">
                <button 
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all shadow-lg"
                  title="Đổi màu giao diện"
                >
                  <Palette size={18} />
                </button>
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

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`relative bg-[#1e1e2e] rounded-3xl w-full max-w-md overflow-hidden border border-white/10 shadow-2xl transform scale-100`}>
                <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
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
                        <button onClick={handleGlobalLoginGoogle} className="w-full py-4 rounded-xl bg-white text-gray-900 font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-lg group relative overflow-hidden">
                            <span className="font-extrabold text-blue-600">G</span>
                            <span>Đăng nhập bằng Google</span>
                            <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1"><ArrowRight size={16} /></div>
                        </button>
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-gray-700"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase">Hoặc dùng tên tạm</span>
                            <div className="flex-grow border-t border-gray-700"></div>
                        </div>
                        <form onSubmit={handleGlobalLoginGuest} className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tên hiển thị</label>
                            <div className="flex gap-2">
                                <input type="text" value={guestNameInput} onChange={(e) => setGuestNameInput(e.target.value)} placeholder="VD: Quyết tâm 28đ" className="flex-grow bg-black/30 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/50 text-sm transition-colors" />
                                <button type="submit" disabled={!guestNameInput.trim()} className={`px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>Vào</button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 italic">* Tài khoản khách chỉ lưu dữ liệu trên thiết bị này.</p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-[#1e1e2e] rounded-3xl w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-indigo-500/20 to-transparent pointer-events-none"></div>
                  <button onClick={() => setShowEditProfile(false)} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors z-10">
                      <X size={20} />
                  </button>

                  <div className="p-6 pt-8 flex flex-col items-center flex-grow overflow-y-auto custom-scrollbar">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                          <Edit3 size={18} className="text-indigo-400" /> Chỉnh sửa hồ sơ
                      </h3>

                      {/* Avatar Preview & Selection */}
                      <div className="relative mb-6 group">
                          <img 
                            src={editCustomAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${editAvatarSeed || 'default'}`} 
                            alt="Avatar Preview" 
                            className="w-24 h-24 rounded-full border-4 border-[#2a2a3e] bg-white shadow-xl object-cover"
                          />
                          <div className="flex gap-2 absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                              {/* Nút Upload ảnh */}
                              <label className="p-2 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white shadow-lg transition-transform hover:scale-110 border border-[#1e1e2e] cursor-pointer" title="Tải ảnh lên">
                                  <Camera size={14} />
                                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                              </label>
                              {/* Nút Random Dicebear */}
                              <button 
                                onClick={() => { setEditAvatarSeed(Math.random().toString(36)); setEditCustomAvatar(null); }}
                                className="p-2 bg-purple-500 hover:bg-purple-600 rounded-full text-white shadow-lg transition-transform hover:scale-110 border border-[#1e1e2e]"
                                title="Avatar ngẫu nhiên"
                              >
                                <RotateCw size={14} />
                              </button>
                          </div>
                      </div>

                      <div className="w-full space-y-4">
                          {/* Tên hiển thị */}
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Tên hiển thị <span className="text-red-500">*</span></label>
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      value={editName} 
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="w-full bg-black/30 border border-gray-600 rounded-xl px-4 py-3 pl-10 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                      placeholder="Tên của bạn"
                                  />
                                  <UserIcon size={16} className="absolute left-3 top-3.5 text-gray-500" />
                              </div>
                          </div>

                          {/* Lớp & Trường */}
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Lớp / Trường</label>
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      value={editClass} 
                                      onChange={(e) => setEditClass(e.target.value)}
                                      className="w-full bg-black/30 border border-gray-600 rounded-xl px-4 py-3 pl-10 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                      placeholder="VD: 12A1 - THPT Chuyên..."
                                  />
                                  <GraduationCap size={16} className="absolute left-3 top-3.5 text-gray-500" />
                              </div>
                          </div>

                          {/* Liên hệ */}
                          <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Link liên hệ (FB/Insta)</label>
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      value={editSocial} 
                                      onChange={(e) => setEditSocial(e.target.value)}
                                      className="w-full bg-black/30 border border-gray-600 rounded-xl px-4 py-3 pl-10 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                      placeholder="https://facebook.com/..."
                                  />
                                  <LinkIcon size={16} className="absolute left-3 top-3.5 text-gray-500" />
                              </div>
                          </div>

                           {/* Bio */}
                           <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Giới thiệu ngắn</label>
                              <div className="relative">
                                  <textarea 
                                      value={editBio} 
                                      onChange={(e) => setEditBio(e.target.value)}
                                      className="w-full bg-black/30 border border-gray-600 rounded-xl px-4 py-3 pl-10 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                                      placeholder="Câu nói yêu thích, mục tiêu..."
                                  />
                                  <FileText size={16} className="absolute left-3 top-3.5 text-gray-500" />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-t border-white/10 bg-[#1a1a2e]">
                      <button 
                          onClick={handleUpdateProfile}
                          disabled={isUpdatingProfile}
                          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {isUpdatingProfile ? <div className="animate-spin w-4 h-4 border-2 border-white rounded-full border-t-transparent"></div> : <ArrowRight size={18} />}
                          <span>Lưu hồ sơ</span>
                      </button>
                      {!firebaseUser && (
                          <p className="text-xs text-red-400 mt-2 text-center">
                              * Tài khoản khách: Dữ liệu chỉ lưu tạm thời trên máy này.
                          </p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* VIEW USER PROFILE MODAL */}
      <UserProfileModal 
        userId={viewingUserId} 
        isOpen={!!viewingUserId} 
        onClose={() => setViewingUserId(null)} 
      />

      {/* Main Admin Dashboard Overlay */}
      {showAdmin && (
          <AdminDashboard 
            messages={messages} 
            onDeleteMessages={handleDeleteMessages} 
            onClose={() => setShowAdmin(false)}
            theme={currentTheme}
          />
      )}

      {/* FLOATING ACTION BUTTON */}
      {showScrollButton && activeTab === 'home' && !showAdmin && (
          <button 
              onClick={scrollToMessageForm}
              className={`fixed z-30 bottom-24 left-6 md:bottom-6 md:left-auto md:right-[50%] md:translate-x-[50%] px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-10 transition-transform hover:scale-105 active:scale-95 bg-[#1a1a2e] border border-white/20`}
          >
              <div className={`p-1.5 rounded-full bg-gradient-to-br ${currentTheme.buttonGradient}`}>
                  <PenTool size={16} className="text-white" />
              </div>
              <span className="font-bold text-sm text-white">Gửi lời chúc</span>
          </button>
      )}

      <div className={`w-full ${showAdmin ? 'hidden' : ''}`}>
        
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in duration-500 pb-24 flex flex-col min-h-screen">
            <header className="mt-28 md:mt-40 text-center px-4 z-10">
                <h1 className={`text-2xl md:text-5xl font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientTitle} mb-3 drop-shadow-lg transition-all duration-500 leading-normal py-4`}>
                ĐẾM NGƯỢC ĐẾN NGÀY THI <br className="md:hidden" /> THPT QUỐC GIA 2026
                </h1>
                <p className="text-gray-400 text-xs md:text-base font-light max-w-lg mx-auto">
                "Hành trình vạn dặm bắt đầu từ một bước chân." <br/> Cùng nhau nỗ lực nhé!
                </p>
            </header>

            <main className="w-full max-w-7xl px-4 z-10 flex flex-col items-center mx-auto flex-grow">
                <Countdown targetDate={EXAM_DATE} theme={currentTheme} />
                <MessageForm onAddMessage={handleAddMessage} theme={currentTheme} />
                <MessageList 
                    messages={messages} 
                    theme={currentTheme} 
                    onViewProfile={handleViewProfile}
                />
            </main>
            
            {/* FOOTER ĐƯỢC GIỮ LẠI THEO YÊU CẦU */}
            <footer className="w-full text-center py-8 z-10 flex flex-col items-center gap-3 mt-auto">
              <p className="text-[10px] text-gray-600">Made with ❤️ by Huỳnh Phước Lộc for 2k8</p>
              <div className="flex items-center gap-4 text-xs font-medium bg-black/20 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                  <a href="https://www.facebook.com/HplIt6030" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                      Huỳnh Phước Lộc
                  </a>
                  <div className="w-[1px] h-3 bg-gray-700"></div>
                  <span className="text-gray-400 flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors" onClick={() => { navigator.clipboard.writeText('0795545909'); alert('Đã sao chép số Zalo!'); }} title="Nhấn để sao chép">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      Zalo: 0795545909
                  </span>
              </div>
           </footer>
          </div>
        )}

        {/* TAB 2: TIMER (Study Tracker) */}
        {activeTab === 'timer' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-20 pb-24">
               <StudyTracker 
                    theme={currentTheme} 
                    user={currentUser} 
                    onViewProfile={handleViewProfile}
                    onSelectVideo={handleSelectVideo}
               />
           </div>
        )}

        {/* TAB 3: ENGLISH LEARNING HUB */}
        {activeTab === 'learning' && (
           <div className="w-full max-w-6xl mx-auto pt-24 px-4 pb-24 animate-in fade-in duration-500">
               {learningSubject === 'menu' ? (
                   <div className="max-w-4xl mx-auto">
                       <div className="text-center mb-12">
                           {/* NEW ICON DESIGN */}
                           <div className="relative inline-flex items-center justify-center mb-8 group cursor-pointer">
                                {/* Outer Glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-50 transition-opacity duration-700 animate-pulse-slow"></div>
                                
                                {/* Main Container */}
                                <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-[2rem] bg-gradient-to-br from-[#1e1e2e] to-[#0f0c29] border border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500 z-10 overflow-hidden">
                                    
                                    {/* Glass Shine */}
                                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                                    
                                    {/* Icon Stack */}
                                    <div className="relative z-10 flex flex-col items-center">
                                         <div className="p-3 bg-indigo-500/20 rounded-2xl mb-1 group-hover:-translate-y-1 transition-transform duration-500 border border-indigo-500/30">
                                            <GraduationCap size={40} className="text-indigo-300 drop-shadow-[0_0_10px_rgba(165,180,252,0.8)]" />
                                         </div>
                                         <div className="w-12 h-1 bg-indigo-500/50 rounded-full blur-[2px] mt-2 group-hover:scale-x-125 transition-transform duration-500"></div>
                                    </div>
                                    
                                    {/* Floating Sparkles */}
                                    <div className="absolute top-4 right-4 animate-bounce delay-700">
                                        <Sparkles size={14} className="text-yellow-400 drop-shadow-lg" />
                                    </div>
                                    <div className="absolute bottom-4 left-4 animate-pulse">
                                        <BookOpen size={14} className="text-blue-400 opacity-60" />
                                    </div>
                                </div>

                                {/* Floating Badge */}
                                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border border-white/20 z-20 rotate-12 group-hover:rotate-0 transition-transform duration-300">
                                    Mới
                                </div>
                           </div>

                           <h2 className={`text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradientTitle} uppercase tracking-widest mb-4 drop-shadow-sm`}>
                               Góc Học Tập
                           </h2>
                           <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                               Kho tài liệu, từ vựng và bài tập được biên soạn kỹ lưỡng.<br/>
                               <span className="text-indigo-400 font-bold">Chinh phục điểm 9+</span> ngay hôm nay.
                           </p>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div 
                              onClick={() => setLearningSubject('english')}
                              className="group relative cursor-pointer"
                           >
                               <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-300 blur-sm group-hover:blur-md"></div>
                               <div className="relative h-full bg-[#1e1e2e] rounded-2xl p-6 md:p-8 flex flex-col items-center text-center border border-white/10 hover:border-white/20 transition-all">
                                   <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                       <BookOpen size={32} className="text-blue-400" />
                                   </div>
                                   <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Tiếng Anh</h3>
                                   <p className="text-sm text-gray-400 mb-6 flex-grow">
                                       3000 từ vựng cốt lõi, Flashcards, Trắc nghiệm & Luyện nghe.
                                   </p>
                                   <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-all">
                                       Bắt đầu học <ArrowRight size={14} />
                                   </span>
                               </div>
                           </div>
                       </div>
                   </div>
               ) : (
                   <EnglishHub 
                        theme={currentTheme} 
                        user={currentUser} 
                   />
               )}
           </div>
        )}

         {/* TAB 4: MUSIC SEARCH */}
         {activeTab === 'music' && (
           <MusicTab theme={currentTheme} onSelectVideo={handleSelectVideo} />
        )}

        {/* GLOBAL COMPONENTS */}
        <MusicPlayer theme={currentTheme} youtubeVideo={youtubeVideo} />
        
        {/* AI ASSISTANT - Luôn hiển thị ở mọi tab */}
        <AiAssistant theme={currentTheme} />
      </div>
    </div>
  );
};

export default App;