import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Loads credentials from environment variables (.env file)
export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB6vF2vaOBkjWWixYbFmse1OKEls7olKvA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'eventmanager-38aed.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://eventmanager-38aed-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'eventmanager-38aed',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'eventmanager-38aed.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '154940650064',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:154940650064:web:bfe688fd96a6347ba25755',
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth & Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firebase Realtime Database Instance
export const rtdb = getDatabase(app);
