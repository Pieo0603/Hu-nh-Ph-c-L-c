import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// --- CẤU HÌNH FIREBASE (demnguocthi) ---
const firebaseConfig = {
  apiKey: "AIzaSyBpwLbPKg5JmpmmuGEWbuQQ2084wEKTbi0",
  authDomain: "demnguocthi.firebaseapp.com",
  projectId: "demnguocthi",
  storageBucket: "demnguocthi.firebasestorage.app",
  messagingSenderId: "230524119706",
  appId: "1:230524119706:web:ca48804ac2dfc145588d23",
  measurementId: "G-MCV7RL8EL7"
};

// Khởi tạo Firebase App
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Firebase Init Error:", e);
  }
} else {
  firebase.app(); 
}

const db = firebase.firestore();

// --- XỬ LÝ AUTHENTICATION AN TOÀN ---
// Hàm tạo Auth giả để App không bị Crash khi chạy trong môi trường bị hạn chế (Preview/Iframe)
const createMockAuth = () => {
  return {
    onAuthStateChanged: (callback: any) => {
        // Luôn trả về Guest (null) ngay lập tức
        callback(null); 
        return () => {}; 
    },
    signInWithPopup: async () => { 
        alert("Tính năng đăng nhập Google không khả dụng trong môi trường xem trước này (Do chính sách chặn Cookie của trình duyệt).\nVui lòng chạy trên localhost hoặc deploy lên tên miền thực tế để đăng nhập.");
        throw new Error("Auth not supported"); 
    },
    signInWithRedirect: async () => { 
        alert("Tính năng đăng nhập không khả dụng trong môi trường này.");
        throw new Error("Auth not supported"); 
    },
    getRedirectResult: async () => ({ user: null }),
    signOut: async () => {},
    currentUser: null,
    updateProfile: async () => {}
  } as unknown as firebase.auth.Auth;
};

// Kiểm tra giao thức mạng và môi trường Iframe
const isSupportedProtocol = typeof window !== 'undefined' && 
   ['http:', 'https:', 'chrome-extension:'].includes(window.location.protocol);

let auth: firebase.auth.Auth;
let googleProvider: firebase.auth.GoogleAuthProvider;

if (isSupportedProtocol) {
  try {
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
  } catch (error) {
    // Nếu khởi tạo thất bại ngay lập tức, dùng Mock
    console.warn("Auth init failed, falling back to mock.");
    auth = createMockAuth();
    googleProvider = {} as any;
  }
} else {
  // Nếu đang chạy file:// hoặc môi trường lạ, dùng Mock ngay lập tức
  auth = createMockAuth();
  googleProvider = {} as any;
}

export { db, auth, googleProvider, firebase };