import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer, increment, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Support environment variables for Vercel deployment
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Check if config is valid (either from file or env)
const isFileConfigValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'PLACEHOLDER' && firebaseConfig.projectId !== 'mock-project';
const isEnvConfigValid = !!envConfig.apiKey;

const activeConfig = isEnvConfigValid 
  ? { ...firebaseConfig, ...Object.fromEntries(Object.entries(envConfig).filter(([_, v]) => v !== undefined)) }
  : (isFileConfigValid ? firebaseConfig : null);
const isValidConfig = !!activeConfig;

const app = initializeApp(activeConfig || {
  apiKey: "mock-key",
  authDomain: "mock-auth",
  projectId: "mock-project",
  appId: "mock-app"
});

export const db = (activeConfig as any)?.firestoreDatabaseId 
  ? getFirestore(app, (activeConfig as any).firestoreDatabaseId) 
  : getFirestore(app);
export const auth = getAuth(app);
export const isFirebaseConfigured = isValidConfig;
export const isDemoMode = !isValidConfig;

export async function awardPoints(points: number, uid?: string) {
  const targetUid = uid || auth.currentUser?.uid;
  if (isDemoMode || !targetUid) return;
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      points: increment(points)
    });
  } catch (err) {
    console.error('Failed to award points:', err);
  }
}

export async function trackTokens(tokens: number, uid?: string) {
  const targetUid = uid || auth.currentUser?.uid;
  if (isDemoMode || !targetUid || !tokens) return;
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      tokensUsed: increment(tokens)
    });
  } catch (err) {
    console.error('Failed to track tokens:', err);
  }
}

// Connection test as per guidelines
async function testConnection() {
  if (!isValidConfig) return;
  try {
    // Try to fetch a non-existent doc to test connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Firestore connection failed. Please check your Firebase configuration in firebase-applet-config.json. The current project ID might be incorrect or Firestore might not be provisioned.");
    }
  }
}

testConnection();

