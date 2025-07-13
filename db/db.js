// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCWAn0VeZLdJUbscRs8BsgVaqvISUSMy7Y",
  authDomain: "rank-optim.firebaseapp.com",
  projectId: "rank-optim",
  storageBucket: "rank-optim.firebasestorage.app",
  messagingSenderId: "973420507650",
  appId: "1:973420507650:web:8923d12c1fa19dfc55ed1b",
  measurementId: "G-KM1WTX4YE1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only on client side
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider, analytics };