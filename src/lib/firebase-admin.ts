
import admin from 'firebase-admin';

console.log("[Firebase Admin Init] Starting initialization process...");

const serviceAccountString = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

let adminAppInstance: admin.app.App | null = null;

if (admin.apps.length > 0) {
  // This case might occur if this module is hot-reloaded and admin was already initialized.
  console.log("[Firebase Admin Init] Admin SDK already initialized in this process. Using existing app.");
  adminAppInstance = admin.apps[0];
} else {
  console.log("[Firebase Admin Init] Admin SDK not yet initialized. Attempting new initialization.");

  if (!projectId) {
    console.error("[Firebase Admin Init] CRITICAL ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set. This is required for some configurations.");
    // Initialization might still proceed if service account JSON contains project_id, but it's good to have this set.
  } else {
    console.log(`[Firebase Admin Init] Project ID from env (NEXT_PUBLIC_FIREBASE_PROJECT_ID): ${projectId}`);
  }

  if (serviceAccountString && serviceAccountString.trim() !== "" && serviceAccountString.trim() !== "undefined") {
    console.log("[Firebase Admin Init] FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON environment variable found and is not empty.");
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      console.log("[Firebase Admin Init] Service account JSON parsed successfully.");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // If Firestore is in a different project or you face discovery issues, uncomment and set:
        // databaseURL: projectId ? `https://${projectId}.firebaseio.com` : undefined
      });
      console.log("[Firebase Admin Init] Firebase Admin SDK initialized successfully with service account credentials.");
      if (admin.apps.length > 0) {
        adminAppInstance = admin.apps[0];
      } else {
        console.error("[Firebase Admin Init] CRITICAL: admin.initializeApp was called with service account, but admin.apps is still empty. This is highly unexpected.");
      }
    } catch (e: unknown) {
      console.error('[Firebase Admin Init] CRITICAL ERROR: Firebase Admin SDK service account JSON parsing OR initialization with cert failed.');
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('[Firebase Admin Init] Error Name:', error.name);
      console.error('[Firebase Admin Init] Error Message:', error.message);
      console.error('[Firebase Admin Init] Ensure FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is set correctly in your .env.local file, is valid JSON, and on a single line with \\n for newlines in the private key.');
      console.error('[Firebase Admin Init] Raw serviceAccountString (first 70 chars to check for "undefined" or emptiness):', String(serviceAccountString).substring(0, 70));
      if (String(serviceAccountString).includes("{") && String(serviceAccountString).includes("}")) {
        console.log("[Firebase Admin Init] Service account string seems to contain JSON structure. Check for validity and correct escaping of newlines (\\n) if copy-pasting.");
      } else {
        console.log("[Firebase Admin Init] Service account string does NOT appear to be a JSON object. It might be missing or incorrectly set.");
      }
    }
  } else {
    console.warn(
      '[Firebase Admin Init] WARNING: FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON environment variable is not set, is empty, or is the string "undefined".'
    );
    console.log("[Firebase Admin Init] Attempting to initialize with Application Default Credentials (ADC). This is suitable for some Google Cloud environments but unlikely for local development without gcloud CLI setup.");
    try {
        admin.initializeApp({
            // databaseURL: projectId ? `https://${projectId}.firebaseio.com` : undefined
        }); // ADC initialization
        console.log("[Firebase Admin Init] Firebase Admin SDK initialized successfully with Application Default Credentials (ADC).");
         if (admin.apps.length > 0) {
          adminAppInstance = admin.apps[0];
        } else {
          console.error("[Firebase Admin Init] CRITICAL: admin.initializeApp was called for ADC, but admin.apps is still empty. This is unexpected.");
        }
    } catch (e: unknown) {
        console.error('[Firebase Admin Init] CRITICAL ERROR: Firebase Admin SDK initialization with ADC also failed.');
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('[Firebase Admin Init] Error Name:', error.name);
        console.error('[Firebase Admin Init] Error Message:', error.message);
        console.error('[Firebase Admin Init] For local development, ensure FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is correctly set in .env.local and your server is restarted.');
        console.error('[Firebase Admin Init] For cloud environments, ensure ADC are correctly configured.');
    }
  }
}

if (adminAppInstance) {
  console.log("[Firebase Admin Init] Firebase Admin SDK instance is available.");
} else {
  console.error("[Firebase Admin Init] CRITICAL FAILURE: Firebase Admin SDK instance is NOT available after all initialization attempts. `adminDb` and `adminAuth` exports will be null.");
}

export const adminAuth = adminAppInstance ? adminAppInstance.auth() : null;
export const adminDb = adminAppInstance ? adminAppInstance.firestore() : null;

// verifyIdToken needs adminAuth to be initialized.
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
  if (!adminAuth) {
    console.error("[Firebase Admin Verify Token] Admin Auth is not initialized (adminAuth is null). Cannot verify ID token.");
    return null;
  }
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("[Firebase Admin Verify Token] Error verifying ID token with Admin SDK:", error);
    return null;
  }
}

// Log final state for clarity when this module is imported.
console.log(`[Firebase Admin Init Module Load] Final export state: adminDb is ${adminDb ? 'CONFIGURED' : 'NULL'}, adminAuth is ${adminAuth ? 'CONFIGURED' : 'NULL'}`);
