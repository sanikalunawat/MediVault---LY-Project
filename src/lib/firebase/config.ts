import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-mock-api-key",
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-mock-auth-domain",
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-mock-project-id",
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-mock-storage-bucket",
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-mock-messaging-sender-id",
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-mock-app-id",
// };

const firebaseConfig = {
  apiKey: "  ",
  authDomain: " ",
  projectId: " ",
  messagingSenderId: " ",
  appId: " ",
  measurementId: " "
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
