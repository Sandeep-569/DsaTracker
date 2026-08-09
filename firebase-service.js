// ============================================================
// FIREBASE SERVICE MODULE
// Pre-configured for dsatracker-6e8d0
// Auth (Google Only) + Cloud Firestore Real-Time Sync
// ============================================================

(function() {
  const ALLOWED_EMAIL = 'codedbysandeep@gmail.com';

  const firebaseConfig = {
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

  function initFirebase() {
    try {
      if (typeof firebase === 'undefined') {
        console.warn("Firebase SDK script not loaded yet.");
        return false;
      }

      if (!firebase.apps || !firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
      } else {
        app = firebase.app();
      }

      auth = firebase.auth();
      db = firebase.firestore();
      googleProvider = new firebase.auth.GoogleAuthProvider();

      // Listen to Auth State changes
      auth.onAuthStateChanged((user) => {
        if (user && user.email !== ALLOWED_EMAIL) {
          auth.signOut();
          currentUser = null;
          window.dispatchEvent(new CustomEvent('firebase-auth-change', { 
            detail: { user: null } 
          }));
          alert("This app is private. Access is restricted to codedbysandeep@gmail.com only.");
          return;
        }

        currentUser = user;
        window.dispatchEvent(new CustomEvent('firebase-auth-change', { 
          detail: { user } 
        }));

        if (user) {
          startFirestoreSync(user.uid);
        } else {
          if (currentUnsubscribe) {
            currentUnsubscribe();
            currentUnsubscribe = null;
          }
        }
      });

      return true;
    } catch (err) {
      console.error("Error initializing Firebase:", err);
      return false;
    }
  }

  // Auth: Google Sign-In Popup
  async function signInWithGoogle() {
    if (!auth) initFirebase();
    if (!auth) throw new Error("Firebase Auth is not available. Please check your internet connection.");
    try {
      const result = await auth.signInWithPopup(googleProvider);
      if (result.user.email !== ALLOWED_EMAIL) {
        await auth.signOut();
        throw new Error("This app is private. Access is restricted to codedbysandeep@gmail.com only.");
      }
      return result.user;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  }

  // Auth: Sign Out
  async function logoutUser() {
    if (!auth) return;
    if (currentUnsubscribe) {
      currentUnsubscribe();
      currentUnsubscribe = null;
    }
    await auth.signOut();
  }

  // Firestore: Save Progress to Cloud
  async function saveProgressToCloud(solvedArray, starredArray) {
    if (!db || !currentUser) return false;
    try {
      await db.collection('users').doc(currentUser.uid).set({
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

  // Firestore: Real-time Sync Listener
  function startFirestoreSync(uid) {
    if (!db) return;
    if (currentUnsubscribe) currentUnsubscribe();

    window.dispatchEvent(new CustomEvent('cloud-sync-status', { 
      detail: { status: 'syncing' } 
    }));

    currentUnsubscribe = db.collection('users').doc(uid).onSnapshot((docSnap) => {
      if (docSnap.metadata && docSnap.metadata.hasPendingWrites) {
        return;
      }

      if (docSnap.exists) {
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
        window.dispatchEvent(new CustomEvent('cloud-new-user-init', { detail: { uid } }));
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      window.dispatchEvent(new CustomEvent('cloud-sync-status', { 
        detail: { status: 'error', error: error.message } 
      }));
    });
  }

  // Expose immediately on global window
  window.FirebaseService = {
    getFirebaseConfig: () => firebaseConfig,
    isFirebaseConfigured: () => true,
    initFirebase,
    signInWithGoogle,
    logoutUser,
    saveProgressToCloud,
    getCurrentUser: () => currentUser
  };

  // Run init on script load
  if (typeof firebase !== 'undefined') {
    initFirebase();
  }
})();