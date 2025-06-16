
import admin from 'firebase-admin';

console.log("[Firebase Admin Init] Starting initialization process...");

const serviceAccountString = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
const clientProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

let adminAppInstance: admin.app.App | null = null;

if (admin.apps.length > 0) {
  console.log("[Firebase Admin Init] Admin SDK already initialized in this process. Using existing app:", admin.apps[0].name);
  adminAppInstance = admin.apps[0];
} else {
  console.log("[Firebase Admin Init] Admin SDK not yet initialized. Attempting new initialization.");

  if (!clientProjectId) {
    console.error("[Firebase Admin Init] CRITICAL WARNING: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set. This can lead to token verification issues if the Admin SDK defaults to a different project.");
  } else {
    console.log(`[Firebase Admin Init] Client-side Project ID from env (NEXT_PUBLIC_FIREBASE_PROJECT_ID): ${clientProjectId}`);
  }

  if (serviceAccountString && serviceAccountString.trim() !== "" && serviceAccountString.trim() !== "undefined") {
    console.log("[Firebase Admin Init] FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON environment variable found and is not empty.");
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      console.log("[Firebase Admin Init] Service account JSON parsed successfully.");

      if (serviceAccount.project_id && clientProjectId && serviceAccount.project_id !== clientProjectId) {
        console.warn(`[Firebase Admin Init] POTENTIAL ISSUE: Service Account Project ID ('${serviceAccount.project_id}') does NOT match Client-side Project ID ('${clientProjectId}'). This can cause token verification failures.`);
      } else if (serviceAccount.project_id) {
        console.log(`[Firebase Admin Init] Service Account Project ID: '${serviceAccount.project_id}'. Client-side Project ID: '${clientProjectId || 'Not Set'}' (ensure they match if client ID is set).`);
      }


      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // If Firestore is in a different project or you face discovery issues, uncomment and set:
        // databaseURL: serviceAccount.project_id ? `https://${serviceAccount.project_id}.firebaseio.com` : undefined
      });
      console.log("[Firebase Admin Init] Firebase Admin SDK initialized successfully with service account credentials.");
      if (admin.apps.length > 0) {
        adminAppInstance = admin.apps[0];
        console.log("[Firebase Admin Init] Admin app name after service account init:", adminAppInstance.name);
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
            // databaseURL: clientProjectId ? `https://${clientProjectId}.firebaseio.com` : undefined
        }); // ADC initialization
        console.log("[Firebase Admin Init] Firebase Admin SDK initialized successfully with Application Default Credentials (ADC).");
         if (admin.apps.length > 0) {
          adminAppInstance = admin.apps[0];
          console.log("[Firebase Admin Init] Admin app name after ADC init:", adminAppInstance.name);
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
  console.log("[Firebase Admin Init] Firebase Admin SDK instance IS available. App name:", adminAppInstance.name);
} else {
  console.error("[Firebase Admin Init] CRITICAL FAILURE: Firebase Admin SDK instance is NOT available after all initialization attempts. `adminDb` and `adminAuth` exports will likely be null or non-functional.");
}

export const adminAuth = adminAppInstance ? adminAppInstance.auth() : null;
export const adminDb = adminAppInstance ? adminAppInstance.firestore() : null;

// verifyIdToken needs adminAuth to be initialized.
export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
  if (!adminAuth) {
    console.error("[Firebase Admin Verify Token] Admin Auth is not initialized (adminAuth is null or non-functional). Cannot verify ID token. Check server startup logs for 'firebase-admin.ts'.");
    return null;
  }
  console.log("[Firebase Admin Verify Token] Attempting to verify ID token with adminAuth...");
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log("[Firebase Admin Verify Token] ID Token verified successfully. UID:", decodedToken.uid);
    return decodedToken;
  } catch (error) {
    console.error("[Firebase Admin Verify Token] Error verifying ID token with Admin SDK. This is the specific error from Firebase Admin:");
    console.error("Error object:", error); // Logs the full error object for details
    // Example of accessing common properties, if they exist
    // const firebaseError = error as { code?: string; message?: string };
    // console.error("Firebase Error Code:", firebaseError.code || "N/A");
    // console.error("Firebase Error Message:", firebaseError.message || "N/A");
    return null;
  }
}

// Log final state for clarity when this module is imported.
console.log(`[Firebase Admin Init Module Load] Final export state: adminDb is ${adminDb ? `CONFIGURED (App: ${adminAppInstance?.name || 'N/A'})` : 'NULL'}, adminAuth is ${adminAuth ? `CONFIGURED (App: ${adminAppInstance?.name || 'N/A'})` : 'NULL'}`);
