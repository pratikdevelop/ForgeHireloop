import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import appletConfig from '../firebase-applet-config.json';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || 'forgehireloop';

let adminApp: App;

if (getApps().length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const parsedCreds = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(parsedCreds),
        projectId,
      });
      console.log(`[Firebase Admin] Initialized with Service Account JSON for project: ${projectId}`);
    } catch (e) {
      console.warn('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to applicationDefault / project config:', e);
      adminApp = initializeApp({ projectId });
    }
  } else {
    try {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      console.log(`[Firebase Admin] Initialized with applicationDefault for project: ${projectId}`);
    } catch {
      adminApp = initializeApp({ projectId });
      console.log(`[Firebase Admin] Initialized with project ID: ${projectId}`);
    }
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export default adminApp;
