import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; 

const firebaseConfig = {
  apiKey: 'AIzaSyCAft1AHFE9nxv8Pay7GTwPPEB-G12EmmM',
  authDomain: 'chat-gpt-e2de9.firebaseapp.com',
  projectId: 'chat-gpt-e2de9',
  storageBucket: 'chat-gpt-e2de9.appspot.com',
  messagingSenderId: '869291160513',
  appId: '1:869291160513:web:d5d4fbfff008ea225c7540'
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);  