import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth }       from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyDXtf7P_H3qLPbIpWhuLfgxPHoQk_pXosE',
  authDomain:        'racha-facil-4ef16.firebaseapp.com',
  projectId:         'racha-facil-4ef16',
  storageBucket:     'racha-facil-4ef16.firebasestorage.app',
  messagingSenderId: '523848983565',
  appId:             '1:523848983565:web:e918f31d24f42ed2cea144',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
