// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDJXv05YAlmbI2RrGUZFcnOCcaqBFsET5w",
  authDomain: "fishub-d1a78.firebaseapp.com",
  projectId: "fishub-d1a78",
  storageBucket: "fishub-d1a78.appspot.com",
  messagingSenderId: "115252770244",
  appId: "1:115252770244:web:7f3e9896fc8f714a5c6091",
  measurementId: "G-LTFJCJG69Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
