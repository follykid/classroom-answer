import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyC6HVhgBVSD7OpvIqZLr_vIVGX5mKVQKWc',
  authDomain: 'classroom-answer.firebaseapp.com',
  databaseURL: 'https://classroom-answer-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'classroom-answer',
  storageBucket: 'classroom-answer.firebasestorage.app',
  messagingSenderId: '947311800565',
  appId: '1:947311800565:web:3223f829e6ac6e66d295bc',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);