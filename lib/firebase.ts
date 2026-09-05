import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Public web-app config (safe to expose; security lives in Firestore rules).
// Set these in .env.local for local dev and in apphosting.yaml for deploys.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;

/** Lazily initialized so importing this module never throws at build time. */
function getApp(): FirebaseApp {
  if (!app) app = getApps()[0] ?? initializeApp(config);
  return app;
}

export function auth(): Auth {
  return getAuth(getApp());
}

export function db(): Firestore {
  return getFirestore(getApp());
}
