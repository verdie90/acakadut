import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let db: Firestore | undefined;

function getFirebaseAdmin() {
  if (!app && getApps().length === 0) {
    // Check if service account key is provided as environment variable
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        app = initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (error) {
        console.error('Error parsing service account key:', error);
        // Fallback to application default credentials
        app = initializeApp();
      }
    } else {
      // Use application default credentials (for local development with gcloud CLI)
      // Or when deployed to Google Cloud Platform
      app = initializeApp();
    }
  }
  
  if (!db) {
    db = getFirestore();
  }
  
  return { app, db };
}

export { getFirebaseAdmin };
