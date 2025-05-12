import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            'AIzaSyCyJ09wZm8Dd_PAnLGhculO-5utkCVZGEA',
  authDomain:        'workly-9872e.firebaseapp.com',
  projectId:         'workly-9872e',
  storageBucket:     'workly-9872e.firebasestorage.app',      
  messagingSenderId: '452351847078',
  appId:             '1:452351847078:web:6814f148110c2f792fe267',
  measurementId:     'G-YY7KZDWX29',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { firebaseConfig };
export const storage = getStorage(app);
