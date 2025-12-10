import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, Minimize2, Radio, Maximize2, AlertCircle, ExternalLink, X, RotateCcw } from 'lucide-react';
import { ThemeConfig } from '../types';

interface MusicPlayerProps {
    theme: ThemeConfig;
    youtubeVideo: {id: string, title: string, channel: string, cover: string} | null;
}

const MP3_PLAYLIST = [
  {
    title: "Chill Lofi Beat",
    artist: "Relaxing Vibe",
    src: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
    cover: "https://i.pinimg.com/564x/df/0c/32/df0c326075f73752e35c23a765796a5b.jpg"
  },
  {
    title: "Night Study",
    artist: "Quiet Time",
    src: "https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3",
    cover: "https://i.pinimg.com/564x/a0/a0/0a/a0a00a6a65033ef27b56500318041c2c.jpg"
  },
  {
    title: "Ambient Piano",
    artist: "Soft Melodies",
    src: "https://cdn.pixabay.com/audio/2022/03/09/audio_c8c8a73467.mp3",
    cover: "https://i.pinimg.com/564x/bc/58/11/bc5811da22846df220d5c0d29729b86e.jpg"
  }
];

declare global {
    interface Window {
      YT: any;
      onYouTubeIframeAPIReady: () => void;
    }
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ theme, youtubeVideo: initialYoutubeVideo }) => {
  // Local state to handle fallback switching from YT to MP3
  const [activeYoutubeVideo, setActiveYoutubeVideo] = useState(initialYoutubeVideo);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Default minimized
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(true); // Toggle for Mini Player visibility
  const [hasError, setHasError] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytPlayerRef = useRef<any>(null);

  // Sync props to state
  useEffect(() => {
    setActiveYoutubeVideo(initialYoutubeVideo);
  }, [initialYoutubeVideo]);

  // Determine current mode
  const isYouTubeMode = !!activeYoutubeVideo;
  const currentMp3 = MP3_PLAYLIST[currentTrackIndex];

  // Auto expand when a new video is selected
  useEffect(() => {
    if (activeYoutubeVideo) {
        setIsExpanded(true);
        setShowVideo(true);
        setHasError(false);
    }
  }, [activeYoutubeVideo]);

  // --- HTML5 Audio Logic ---
  useEffect(() => {
    if (!isYouTubeMode && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Audio play error:", e));
      } else {
        audioRef.current.pause();
      }
    } else if (isYouTubeMode && audioRef.current) {
        audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex, isYouTubeMode]);

  // --- YouTube Player Initialization ---
  useEffect(() => {
    if (isYouTubeMode) {
        setHasError(false);
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
            window.onYouTubeIframeAPIReady = () => initYtPlayer();
        } else {
            initYtPlayer();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTubeMode, activeYoutubeVideo?.id]);

  const initYtPlayer = () => {
      if (!activeYoutubeVideo) return;

      if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
          try {
             ytPlayerRef.current.loadVideoById(activeYoutubeVideo.id);
             setIsPlaying(true);
             setHasError(false);
          } catch(e) {
             console.error("Load video error", e);
             setHasError(true);
          }
          return;
      }

      if (window.YT && window.YT.Player) {
          try {
            // Safe origin handling
            const origin = window.location.protocol.startsWith('http') ? window.location.origin : undefined;

            ytPlayerRef.current = new window.YT.Player('youtube-mini-player', {
                height: '100%',
                width: '100%',
                videoId: activeYoutubeVideo.id,
                playerVars: { 
                    'playsinline': 1, 
                    'controls': 1, 
                    'disablekb': 1, 
                    'fs': 0, 
                    'autoplay': 1,
                    'enablejsapi': 1,
                    'rel': 0,
                    'origin': origin, 
                },
                events: {
                    'onReady': (event: any) => {
                        event.target.playVideo();
                        setIsPlaying(true);
                        setHasError(false);
                    },
                    'onStateChange': (event: any) => {
                        if (event.data === 1) { // Playing
                            setIsPlaying(true);
                            setHasError(false);
                        }
                        if (event.data === 2) setIsPlaying(false); // Paused
                        if (event.data === 0) setIsPlaying(false); // Ended
                    },
                    'onError': (event: any) => {
                        console.error("YT Error Event:", event.data);
                        setHasError(true);
                        setIsPlaying(false);
                    }
                }
            });
          } catch (e) {
              console.error("Init player error", e);
              setHasError(true);
          }
      }
  };

  // --- Handlers ---
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isYouTubeMode && ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
        const state = ytPlayerRef.current.getPlayerState();
        if (state === 1) { // Playing
            ytPlayerRef.current.pauseVideo();
            setIsPlaying(false);
        } else {
            ytPlayerRef.current.playVideo();
            setIsPlaying(true);
        }
    } else {
        setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isYouTubeMode) {
        if(ytPlayerRef.current) {
            ytPlayerRef.current.seekTo(0);
            ytPlayerRef.current.playVideo();
            setIsPlaying(true);
        }
    } else {
        setCurrentTrackIndex((prev) => (prev + 1) % MP3_PLAYLIST.length);
        setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);

    if (isYouTubeMode && ytPlayerRef.current) {
        if (newMuteState) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
    } else if (audioRef.current) {
        audioRef.current.muted = newMuteState;
    }
  };

  const closeVideo = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowVideo(false);
  }

  const switchToMp3 = () => {
      setActiveYoutubeVideo(null); // Turn off YouTube mode
      setIsPlaying(true);
  }

  // --- Render ---
  const displayTitle = isYouTubeMode ? activeYoutubeVideo?.title : currentMp3.title;
  const displayArtist = isYouTubeMode ? activeYoutubeVideo?.channel : currentMp3.artist;
  const displayCover = isYouTubeMode ? activeYoutubeVideo?.cover : currentMp3.cover;

  return (
    <div className="fixed bottom-6 left-6 z-[80] flex items-end">
      
      <audio ref={audioRef} src={currentMp3.src} onEnded={() => setCurrentTrackIndex((p) => (p + 1) % MP3_PLAYLIST.length)} />
      
      {/* 
          MINI YOUTUBE TV PLAYER (Draggable illusion via fixed position)
          Tách biệt "phần dưới không liên quan" như bạn yêu cầu
      */}
      <div 
        className={`
            fixed bottom-28 left-6 z-[60] 
            w-72 h-40 md:w-80 md:h-48
            bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-[#222] 
            transition-all duration-500 origin-bottom-left flex flex-col items-center justify-center
            ${isYouTubeMode && isExpanded && showVideo ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-50 translate-y-20 pointer-events-none'}
        `}
      >
         {/* TV Frame Effect */}
         <div className="absolute inset-0 pointer-events-none z-20 border-[6px] border-[#111] rounded-xl shadow-inner"></div>

         {/* Container cho iframe - HIDE when error to prevent ugly text */}
         <div id="youtube-mini-player" className={`w-full h-full bg-black ${hasError ? 'hidden' : 'block'}`}></div>
         
         {/* Custom Error State Overlay (TV Noise Effect) */}
         {hasError && (
             <div className="absolute inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center text-center p-4 z-10 w-full h-full">
                 {/* Static Noise Animation (Optional simplified CSS) */}
                 <div className="mb-2 p-2 bg-red-500/10 rounded-full">
                     <AlertCircle className="text-red-500 animate-pulse" size={24} />
                 </div>
                 <p className="text-[12px] font-bold text-white mb-1">Không thể phát</p>
                 <p className="text-[10px] text-gray-400 mb-3 px-2 leading-tight">Video này chặn nhúng.</p>
                 
                 <div className="flex gap-2">
                    <button 
                        onClick={switchToMp3} 
                        className="flex items-center gap-1 text-[10px] font-bold text-white bg-green-600 px-3 py-1.5 rounded-full hover:bg-green-500 transition-colors shadow-lg"
                    >
                        <RotateCcw size={10} /> Nghe Lofi có sẵn
                    </button>
                    <a 
                        href={`https://www.youtube.com/watch?v=${activeYoutubeVideo?.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] font-bold text-black bg-white px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                    >
                        <ExternalLink size={10} /> Mở Youtube
                    </a>
                 </div>
             </div>
         )}
         
         {/* Controls trên TV */}
         <div className="absolute top-2 right-2 flex gap-2 z-30">
            <button 
                onClick={closeVideo}
                className="p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full text-white/80 hover:text-white transition-colors"
                title="Tắt màn hình"
            >
                <X size={12} />
            </button>
         </div>
      </div>

      {/* Nút bật lại màn hình video khi đã ẩn */}
      {isYouTubeMode && isExpanded && !showVideo && (
         <button 
            onClick={() => setShowVideo(true)}
            className="absolute bottom-24 left-6 mb-2 bg-black/80 backdrop-blur-md text-white/90 hover:text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 shadow-lg hover:scale-105 transition-transform"
         >
            <Maximize2 size={12} /> Mở lại TV
         </button>
      )}


      {/* MINIMIZED ICON (Đĩa than) - Phần này là control bar */}
      <div 
        className={`relative transition-all duration-500 cursor-pointer group ${isExpanded ? 'opacity-0 pointer-events-none scale-0' : 'opacity-100 scale-100'}`}
        onClick={() => setIsExpanded(true)}
      >
        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-white/20 bg-black/60 backdrop-blur-md shadow-2xl flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''}`}>
           <div className="absolute w-full h-full rounded-full overflow-hidden opacity-80 p-0.5">
             <img src={displayCover} alt="cover" className="w-full h-full object-cover rounded-full" />
           </div>
           <div className="w-3 h-3 bg-[#111] rounded-full z-10 border border-gray-500 flex items-center justify-center">
              {isYouTubeMode && <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
           </div>
        </div>
      </div>

      {/* EXPANDED CONTROL BAR (Phần dưới) */}
      <div 
        className={`absolute bottom-0 left-0 transition-all duration-500 origin-bottom-left ${isExpanded ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}
      >
          {/* Ảnh đĩa than trồi lên (chỉ hiện khi Video bị ẩn, nếu hiện Video thì ẩn cái này đi cho đỡ rối mắt) */}
          <div className={`absolute bottom-full left-4 mb-[-25px] transition-all duration-700 z-0 ${isExpanded && isPlaying && !showVideo ? '-translate-y-8 rotate-12 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className={`w-20 h-20 rounded-full border-4 border-gray-900 bg-black shadow-xl flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''}`}>
                <div className="absolute w-full h-full rounded-full overflow-hidden opacity-80">
                    <img src={displayCover} alt="cover" className="w-full h-full object-cover" />
                </div>
                <div className="w-5 h-5 bg-gray-300 rounded-full z-10 border-2 border-black flex items-center justify-center">
                    {isYouTubeMode && <Radio size={10} className="text-red-600" />}
                </div>
            </div>
        </div>

        {/* Controls */}
        <div className={`glass-panel pl-4 pr-2 py-3 rounded-full flex items-center gap-3 shadow-2xl border-white/10 bg-[#121212]/90 backdrop-blur-xl border border-white/10 relative z-10 w-[280px] md:w-auto`}>
            
            <div className="flex flex-col mr-auto max-w-[120px]">
                <span className="text-xs font-bold text-white truncate">{displayTitle}</span>
                <span className="text-[10px] text-gray-400 truncate">{displayArtist}</span>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={togglePlay}
                    className={`w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r ${theme.buttonGradient} hover:opacity-90 transition-all text-white shadow-lg active:scale-90`}
                >
                    {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
                </button>

                <button 
                    onClick={nextTrack}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-300 transition-all active:scale-90"
                >
                    <SkipForward size={16} />
                </button>

                <button 
                    onClick={toggleMute}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all hidden sm:block active:scale-90"
                >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-all border-l border-white/10 ml-1 active:scale-90"
                    title="Thu nhỏ"
                >
                    <Minimize2 size={14} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;