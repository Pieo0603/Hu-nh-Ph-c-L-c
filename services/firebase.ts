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

// Initialize Firebase (v9 Compat)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}

const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

export { db, auth, googleProvider, firebase };