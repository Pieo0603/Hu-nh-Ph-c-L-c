import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { AppUser } from '../types';
import { X, Link as LinkIcon, GraduationCap, Quote, Loader2 } from 'lucide-react';

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
  isOpen: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose, isOpen }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      // Reset state
      setUser(null);
      setLoading(true);

      // Nếu là guest (id bắt đầu bằng guest-) thì không fetch firebase
      if (userId.startsWith('guest-')) {
          setLoading(false);
          return;
      }

      db.collection('users').doc(userId).get()
        .then(doc => {
          if (doc.exists) {
            setUser({ uid: doc.id, ...doc.data() } as AppUser);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching user profile:", err);
          setLoading(false);
        });
    }
  }, [userId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#1e1e2e] rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Background */}
        <div className="h-24 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-colors z-10">
                <X size={18} />
            </button>
        </div>

        <div className="px-6 pb-8 -mt-12 flex flex-col items-center">
            {/* Avatar */}
            <div className="relative mb-3">
                <div className="w-24 h-24 rounded-full border-4 border-[#1e1e2e] bg-[#2a2a3e] shadow-xl flex items-center justify-center overflow-hidden">
                    {loading ? (
                        <Loader2 className="animate-spin text-gray-500" />
                    ) : (
                        <img 
                            src={user?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-2 w-full flex flex-col items-center animate-pulse">
                    <div className="h-6 w-32 bg-white/10 rounded"></div>
                    <div className="h-4 w-20 bg-white/10 rounded"></div>
                </div>
            ) : (
                <>
                    {/* Name & Class */}
                    <h3 className="text-xl font-bold text-white text-center">
                        {user?.displayName || "Người dùng ẩn danh"}
                    </h3>
                    
                    {user?.className && (
                        <div className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                            <GraduationCap size={12} className="text-indigo-400" />
                            <span className="text-xs font-bold text-gray-300">{user.className}</span>
                        </div>
                    )}

                    {/* Guest Warning */}
                    {userId?.startsWith('guest-') && (
                        <p className="text-xs text-gray-500 mt-2 italic">(Tài khoản khách)</p>
                    )}

                    {/* Bio */}
                    {user?.bio ? (
                        <div className="mt-6 w-full relative bg-black/20 p-4 rounded-xl border border-white/5">
                            <Quote size={12} className="absolute top-3 left-3 text-gray-600 -scale-x-100" />
                            <p className="text-sm text-gray-300 italic text-center px-2 leading-relaxed font-sans">
                                "{user.bio}"
                            </p>
                            <Quote size={12} className="absolute bottom-3 right-3 text-gray-600" />
                        </div>
                    ) : (
                        !userId?.startsWith('guest-') && (
                            <p className="text-xs text-gray-500 mt-4 italic">Người dùng chưa cập nhật giới thiệu.</p>
                        )
                    )}

                    {/* Social Link */}
                    {user?.socialLink && (
                        <a 
                            href={user.socialLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/30"
                        >
                            <LinkIcon size={16} />
                            <span>Kết nối ngay</span>
                        </a>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;