// firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Senin verdiğin gerçek firebase config bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyDJXv05YAlmbI2RrGUZFcnOCcaqBFsET5w",
  authDomain: "fishub-d1a78.firebaseapp.com",
  projectId: "fishub-d1a78",
  storageBucket: "fishub-d1a78.appspot.com",
  messagingSenderId: "115252770244",
  appId: "1:115252770244:web:7f3e9896fc8f714a5c6091",
  measurementId: "G-LTFJCJG69Z"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Auth servisini dışa aktar
export const auth = getAuth(app);
