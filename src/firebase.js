import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBct_oePFmk1l-RjB9JWYBpvQeyDO_Kd-w",
  authDomain: "quizlive-57156.firebaseapp.com",
  databaseURL: "https://quizlive-57156-default-rtdb.firebaseio.com",
  projectId: "quizlive-57156",
  storageBucket: "quizlive-57156.firebasestorage.app",
  messagingSenderId: "726216889184",
  appId: "1:726216889184:web:4aa145992bbd545451c405",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
