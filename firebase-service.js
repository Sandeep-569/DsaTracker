// ============================================================
// FIREBASE SERVICE MODULE (v10 Modular SDK via CDN)
// Auth (Google, Email/Password) + Cloud Firestore Sync
// ============================================================

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const CONFIG_STORAGE_KEY = 'dsa_tracker_firebase_config_v1';

// Only this email is allowed to sign in and use the app
const ALLOWED_EMAIL = 'codedbysandeep@gmail.com';

// Default / Production Firebase Config for dsatracker-6e8d0
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyDHnoMx4VGoJmFLfecowFVCQsaoa51WYCg",
  authDomain: "dsatracker-6e8d0.firebaseapp.com",
  projectId: "dsatracker-6e8d0",
  storageBucket: "dsatracker-6e8d0.firebasestorage.app",
  messagingSenderId: "535212407160",
  appId: "1:535212407160:web:ed4693ecd580916c2db08d"
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let currentUnsubscribe = null;
let currentUser = null;

// Get Active Firebase Config from localStorage or Default
export function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId) return parsed;
    }
  } catch (e) {
    console.warn("Could not read saved Firebase config:", e);
  }
  return DEFAULT_CONFIG;
}

// Check if Firebase is properly configured
export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg && cfg.apiKey && cfg.projectId && cfg.apiKey.trim().length > 10 && !cfg.apiKey.includes("YOUR_"));
}

// Initialize or Re-initialize Firebase
export function initFirebase(customConfig = null) {
  try {
    const config = customConfig || getFirebaseConfig();

    if (!config.apiKey || !config.projectId || config.apiKey.includes("YOUR_")) {
      console.log("Firebase is not yet configured with a valid project. Local storage mode active.");
      window.dispatchEvent(new CustomEvent('firebase-status-change', {
        detail: { status: 'unconfigured', configured: false }
      }));
      return false;
    }

    // Clean up existing apps if any
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(config);
    }

    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();

    // Listen to Auth State
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      window.dispatchEvent(new CustomEvent('firebase-auth-change', {
        detail: { user }
      }));

      if (user) {
        // Start listening to real-time progress for this user
        startFirestoreSync(user.uid);
      } else {
        if (currentUnsubscribe) {
          currentUnsubscribe();
          currentUnsubscribe = null;
        }
      }
    });

    window.dispatchEvent(new CustomEvent('firebase-status-change', {
      detail: { status: 'ready', configured: true }
    }));
    return true;
  } catch (err) {
    console.error("Error initializing Firebase:", err);
    window.dispatchEvent(new CustomEvent('firebase-status-change', {
      detail: { status: 'error', error: err.message, configured: false }
    }));
    return false;
  }
}

// Save Custom Config to Local Storage & Re-init
export function saveFirebaseConfig(configObj) {
  if (!configObj || !configObj.apiKey || !configObj.projectId) {
    throw new Error("Invalid configuration. apiKey and projectId are required.");
  }
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configObj, null, 2));
  return initFirebase(configObj);
}

// Clear Saved Config
export function clearFirebaseConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  if (auth && currentUser) {
    signOut(auth);
  }
  app = null;
  auth = null;
  db = null;
  currentUser = null;
  window.dispatchEvent(new CustomEvent('firebase-status-change', {
    detail: { status: 'unconfigured', configured: false }
  }));
}

// Auth: Sign In with Google Popup
export async function signInWithGoogle() {
  if (!auth) throw new Error("Firebase Auth is not initialized. Please connect your Firebase project.");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user.email !== ALLOWED_EMAIL) {
      await signOut(auth);
      throw new Error("This app is private. Access is restricted to the owner's account only.");
    }
    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

// Auth: Sign In with Email & Password
export async function signInWithEmail(email, password) {
  if (!auth) throw new Error("Firebase Auth is not initialized. Please connect your Firebase project.");
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (result.user.email !== ALLOWED_EMAIL) {
      await signOut(auth);
      throw new Error("This app is private. Access is restricted to the owner's account only.");
    }
    return result.user;
  } catch (error) {
    console.error("Email sign-in error:", error);
    throw error;
  }
}

// Auth: Sign Up with Email & Password
export async function signUpWithEmail(email, password, displayName = "") {
  if (!auth) throw new Error("Firebase Auth is not initialized. Please connect your Firebase project.");
  try {
    if (email !== ALLOWED_EMAIL) {
      throw new Error("This app is private. Access is restricted to the owner's account only.");
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    return result.user;
  } catch (error) {
    console.error("Email sign-up error:", error);
    throw error;
  }
}

// Auth: Sign Out
export async function logoutUser() {
  if (!auth) return;
  if (currentUnsubscribe) {
    currentUnsubscribe();
    currentUnsubscribe = null;
  }
  await signOut(auth);
}

// Firestore: Save User Progress to Cloud
export async function saveProgressToCloud(solvedArray, starredArray) {
  if (!db || !currentUser) return false;
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, {
      solvedProblems: solvedArray,
      starredProblems: starredArray,
      updatedAt: new Date().toISOString(),
      userEmail: currentUser.email || '',
      displayName: currentUser.displayName || ''
    }, { merge: true });

    window.dispatchEvent(new CustomEvent('cloud-sync-status', {
      detail: { status: 'synced', timestamp: new Date() }
    }));
    return true;
  } catch (err) {
    console.error("Error saving progress to Firestore:", err);
    window.dispatchEvent(new CustomEvent('cloud-sync-status', {
      detail: { status: 'error', error: err.message }
    }));
    return false;
  }
}

// Firestore: Fetch Initial Progress Once
export async function fetchUserProgress(uid) {
  if (!db) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.error("Error fetching user progress from Firestore:", err);
    return null;
  }
}

// Firestore: Start Real-time Sync Listener
function startFirestoreSync(uid) {
  if (!db) return;
  if (currentUnsubscribe) currentUnsubscribe();

  window.dispatchEvent(new CustomEvent('cloud-sync-status', {
    detail: { status: 'syncing' }
  }));

  const userDocRef = doc(db, 'users', uid);
  currentUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      window.dispatchEvent(new CustomEvent('cloud-data-received', {
        detail: {
          solvedProblems: data.solvedProblems || [],
          starredProblems: data.starredProblems || [],
          updatedAt: data.updatedAt
        }
      }));
      window.dispatchEvent(new CustomEvent('cloud-sync-status', {
        detail: { status: 'synced', timestamp: new Date() }
      }));
    } else {
      // New user doc doesn't exist yet, push current local state up
      window.dispatchEvent(new CustomEvent('cloud-new-user-init', { detail: { uid } }));
    }
  }, (error) => {
    console.error("Firestore onSnapshot error:", error);
    window.dispatchEvent(new CustomEvent('cloud-sync-status', {
      detail: { status: 'error', error: error.message }
    }));
  });
}

// Export everything to global window.FirebaseService for easy access
window.FirebaseService = {
  getFirebaseConfig,
  isFirebaseConfigured,
  initFirebase,
  saveFirebaseConfig,
  clearFirebaseConfig,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  logoutUser,
  saveProgressToCloud,
  fetchUserProgress,
  getCurrentUser: () => currentUser
};

// Auto-init on script load
initFirebase();