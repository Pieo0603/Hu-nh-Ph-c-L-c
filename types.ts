
export interface Message {
  id: string;
  author: string;
  content: string;
  imageUrl?: string;
  timestamp: number;
  isAnonymous: boolean;
  avatarUrl?: string;
  userId?: string; // Add userId to link to profile
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface Track {
  title: string;
  artist: string;
  src: string;
  cover: string;
}

export interface ThemeConfig {
  id: string;
  hex: string;           // Hex color for the picker circle
  text: string;          // Primary text color class (e.g., text-pink-400)
  textDim: string;       // Secondary text color class
  border: string;        // Border color class
  shadow: string;        // Shadow class
  gradientTitle: string; // Gradient text for title
  buttonGradient: string;// Gradient for primary buttons
  icon: string;          // Icon color class
  inputFocus: string;    // Input focus ring/border classes
}

// Định nghĩa AppUser ở đây để dùng chung
export interface AppUser {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    isAnonymous?: boolean;
    // Extended fields
    bio?: string;          // Giới thiệu bản thân
    className?: string;    // Tên lớp (VD: 12A1)
    socialLink?: string;   // Link Facebook/Insta
}

export interface StudyLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  subject: string;
  durationMinutes: number; // Thời gian thực tế đã học
  targetMinutes: number;   // Mục tiêu
  notes: string;
  timestamp: number;
  isCompleted: boolean; // Đạt mục tiêu hay không
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar: string;
  totalMinutes: number;
  sessionsCount: number;
  lastActive: number;
}

// --- NEW TYPES FOR ENGLISH LEARNING ---

export interface VocabItem {
  id: string;
  topicId: string;
  word: string;          // appear
  type: string;          // v, n, adj...
  pronunciation: string; // /əˈpɪə(r)/
  meaning: string;       // xuất hiện
  level: string;         // B1
  synonyms: string;      // emerge, show
  antonyms: string;      // disappear
  mastered?: boolean;    // Local state for progress
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
}
