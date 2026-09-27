import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs, writeBatch } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App instance
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the designated database ID if provided, otherwise default instance
export const db = firebaseConfigData.firestoreDatabaseId 
  ? getFirestore(firebaseApp, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export { doc, getDoc, setDoc, onSnapshot, collection, getDocs, writeBatch };
