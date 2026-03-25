import { auth } from './config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const _provider = new GoogleAuthProvider();

// Garante persistência local para PWA
setPersistence(auth, browserLocalPersistence).catch(() => {});

export function signInWithGoogle() {
  return signInWithPopup(auth, _provider);
}

export function handleRedirectResult() {
  return getRedirectResult(auth);
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
