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

// Standalone PWA no iOS: popup abre em contexto separado e não volta para o app.
// Nesses casos usamos redirect. Em browser normal mobile o redirect também funciona bem.
// Desktop mantém popup.
const _isMobile     = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const _isStandalone = window.navigator.standalone === true ||
                      window.matchMedia('(display-mode: standalone)').matches;

// Garante persistência local para PWA
setPersistence(auth, browserLocalPersistence).catch(() => {});

export function signInWithGoogle() {
  if (_isMobile || _isStandalone) return signInWithRedirect(auth, _provider);
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
