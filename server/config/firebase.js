import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

let app;
let initError = null;

const initializeFirebaseAdmin = () => {
  if (app) return app;

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        // Strip out any surrounding quotes that might have been pasted in Render's env var editor
        let cleanJsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
        if (cleanJsonStr.startsWith('"') && cleanJsonStr.endsWith('"')) {
          cleanJsonStr = cleanJsonStr.slice(1, -1);
        }
        
        // Handle escaped double backslashes in Render environment variable editor
        cleanJsonStr = cleanJsonStr.replace(/\\\\n/g, "\\n");

        const serviceAccount = JSON.parse(cleanJsonStr);
        credential = cert(serviceAccount);
      } catch (parseErr) {
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${parseErr.message}`);
      }
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
    }

    if (credential) {
      app = initializeApp({
        credential,
      });
      console.log("[FirebaseAdmin] Successfully initialized Firebase Admin SDK");
    } else {
      console.warn(
        "[FirebaseAdmin] Warning: Firebase credentials are not configured. Google Sign-In will not be functional."
      );
    }
  } catch (error) {
    initError = error;
    console.error("[FirebaseAdmin] Critical: Failed to initialize Firebase Admin SDK:", error.message);
  }

  return app;
};

// Initialize on load
initializeFirebaseAdmin();

export const verifyIdToken = async (idToken) => {
  const adminApp = initializeFirebaseAdmin();
  if (!adminApp) {
    const errorDetails = initError ? initError.message : "No credentials found in environment variables.";
    throw new Error(`Firebase Admin SDK is not initialized. Details: ${errorDetails}`);
  }
  return getAuth(adminApp).verifyIdToken(idToken);
};
