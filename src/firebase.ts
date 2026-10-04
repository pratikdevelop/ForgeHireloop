import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDocFromServer,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import appletConfig from '../firebase-applet-config.json';

// Configuration reading from environment variables with discard protection for legacy projects
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const isLegacyProject = !envProjectId || envProjectId.startsWith('gen-lang-client');

export const firebaseConfig = {
  apiKey: isLegacyProject ? 'AIzaSyA_LdK4DgIIQdWC1efYAPj1ltkbxwBEB0o' : (import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA_LdK4DgIIQdWC1efYAPj1ltkbxwBEB0o'),
  authDomain: isLegacyProject ? 'forgehireloop.firebaseapp.com' : (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'forgehireloop.firebaseapp.com'),
  projectId: isLegacyProject ? 'forgehireloop' : envProjectId,
  storageBucket: isLegacyProject ? 'forgehireloop.firebasestorage.app' : (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'forgehireloop.firebasestorage.app'),
  messagingSenderId: isLegacyProject ? '633018706293' : (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '633018706293'),
  appId: isLegacyProject ? '1:633018706293:web:444f08918b605385914b3c' : (import.meta.env.VITE_FIREBASE_APP_ID || '1:633018706293:web:444f08918b605385914b3c'),
  measurementId: isLegacyProject ? 'G-2HG1W1QK71' : (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-2HG1W1QK71'),
  firestoreDatabaseId: '(default)',
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore (handles default or custom database)
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Storage
export const storage = getStorage(app);

// Initialize Analytics (browser-only with support check)
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported && firebaseConfig.measurementId) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch((err) => {
      console.warn('Firebase Analytics not supported in this environment:', err);
    });
}
export const analytics = analyticsInstance;

// Skill-mandated operation types and error handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Skill-mandated initial connection validation
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection: client appears offline, check network configuration.');
    }
    return false;
  }
}

// Storage helpers
export async function uploadResumeToStorage(userId: string, file: File): Promise<{ downloadUrl: string; fileName: string }> {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `resumes/${userId}/${timestamp}_${sanitizedFileName}`;
    const fileRef = ref(storage, storagePath);
    
    await uploadBytes(fileRef, file, {
      contentType: file.type || 'application/pdf',
      customMetadata: {
        userId,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    const downloadUrl = await getDownloadURL(fileRef);
    return { downloadUrl, fileName: file.name };
  } catch (err) {
    console.error('Failed to upload resume to Firebase Storage:', err);
    throw err;
  }
}

export async function uploadCompanyLogoToStorage(companyId: string, file: File): Promise<string> {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `company-logos/${companyId}/${timestamp}_${sanitizedFileName}`;
    const fileRef = ref(storage, storagePath);
    
    await uploadBytes(fileRef, file, {
      contentType: file.type || 'image/png',
      customMetadata: {
        companyId,
        uploadedAt: new Date().toISOString(),
      },
    });

    return await getDownloadURL(fileRef);
  } catch (err) {
    console.error('Failed to upload logo to Firebase Storage:', err);
    throw err;
  }
}
