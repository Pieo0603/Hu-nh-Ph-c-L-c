import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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

// Initialize Firebase (Modular Standard)
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
// Truyền app trực tiếp vào getAuth để đảm bảo SDK nhận đúng instance đã cấu hình
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };