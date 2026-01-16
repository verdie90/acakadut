import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let db: Firestore | undefined;

function getFirebaseAdmin() {
  if (!app && getApps().length === 0) {
    // Check if service account key is provided as environment variable
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (serviceAccountKey) {
      try {
        // Handle both JSON string and base64 encoded JSON
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(serviceAccountKey);
        } catch {
          // Try base64 decode if direct parse fails
          const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
          serviceAccount = JSON.parse(decoded);
        }
        
        app = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        });
      } catch (error) {
        console.error('Error parsing service account key:', error);
        throw new Error(
          'Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Please provide a valid JSON string or base64 encoded JSON. ' +
          'See: https://firebase.google.com/docs/admin/setup#initialize-sdk'
        );
      }
    } else if (projectId) {
      // Use project ID with application default credentials
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set. Using application default credentials.');
      app = initializeApp({
        projectId,
      });
    } else {
      throw new Error(
        'Firebase Admin SDK not configured. Please set either:\n' +
        '1. FIREBASE_SERVICE_ACCOUNT_KEY - JSON string of service account key\n' +
        '2. FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID - for application default credentials\n' +
        'See: https://firebase.google.com/docs/admin/setup'
      );
    }
  } else if (getApps().length > 0) {
    app = getApps()[0];
  }
  
  if (!db) {
    db = getFirestore();
  }
  
  return { app, db };
}

// Helper to get adminDb directly
function getAdminDb(): Firestore {
  const { db } = getFirebaseAdmin();
  if (!db) {
    throw new Error('Failed to initialize Firebase Admin Firestore');
  }
  return db;
}

export { getFirebaseAdmin, getAdminDb };

// Create a lazy-initialized singleton for adminDb
let _adminDb: Firestore | null = null;

export function getDb(): Firestore {
  if (!_adminDb) {
    _adminDb = getAdminDb();
  }
  return _adminDb;
}

// For backward compatibility - use getDb() in API routes
export const adminDb = {
  collection: (path: string) => getDb().collection(path),
  doc: (path: string) => getDb().doc(path),
  runTransaction: <T>(updateFunction: Parameters<Firestore['runTransaction']>[0]) => 
    getDb().runTransaction(updateFunction) as Promise<T>,
  batch: () => getDb().batch(),
};
