import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyBGJ9EahEBR-ws2GNfAqyShdAqPzIdmECo',
  authDomain: 'madora-169f9.firebaseapp.com',
  projectId: 'madora-169f9',
  storageBucket: 'madora-169f9.firebasestorage.app',
  messagingSenderId: '74671839980',
  appId: '1:74671839980:web:4c9c84bdcf9538fe0d63c9',
  measurementId: 'G-B313KX6E23',
};

// Initialize Firebase only once
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = getFirestore(app);
export const auth = getAuth(app);
