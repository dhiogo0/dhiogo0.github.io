import { auth } from './config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const _provider = new GoogleAuthProvider();

const _isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function signInWithGoogle() {
  if (_isMobile) return signInWithRedirect(auth, _provider);
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
