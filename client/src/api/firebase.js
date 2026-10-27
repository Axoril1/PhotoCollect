import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

let auth = null;
let googleProvider = null;
let analytics = null;

const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

if (isConfigured) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    };

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

    // Standardize scopes for Google Sign-In
    googleProvider.addScope("profile");
    googleProvider.addScope("email");

    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  } catch (error) {
    console.error("[FirebaseConfig] Failed to initialize Firebase SDK:", error);
  }
}

export { auth, googleProvider, analytics };

/**
 * Trigger Google Login popup and retrieve the Firebase ID token
 * @returns {Promise<{ idToken: string, user: Object }>}
 */
export const signInWithGoogle = async () => {
  if (!isConfigured || !auth || !googleProvider) {
    throw new Error("Google Authentication is not configured in this environment.");
  }
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  // Force refresh token to get the latest claims
  const idToken = await user.getIdToken(true);
  return { idToken, user };
};
