
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, ref as firebaseStorageRef, uploadBytes, getDownloadURL, type FirebaseStorage } from "firebase/storage"; // Aliased ref
import { getFirestore, type Firestore } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

// Your web app's Firebase configuration (Hardcoded from user input)
const firebaseConfig = {
  apiKey: "AIzaSyCo9SX6quTL1Y49BIXbD0MKHr6ACPYSioU",
  authDomain: "quizify-b187a.firebaseapp.com",
  projectId: "quizify-b187a",
  storageBucket: "quizify-b187a.firebasestorage.app",
  messagingSenderId: "582962492906",
  appId: "1:582962492906:web:c4445c229b04538fc12e93"
};

let app: FirebaseApp;

// Initialize Firebase App
// This structure ensures initializeApp is called only once,
// regardless of whether it's client or server.
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("CRITICAL: Firebase app initialization failed.", error);
    // Depending on the app's needs, you might want to throw this error
    // to halt further execution if Firebase is essential.
    // For now, subsequent service initializations will likely fail if 'app' is not set.
    // However, initializeApp itself usually throws if config is severely wrong.
  }
} else {
  app = getApp();
}

// Initialize Firebase Services
// These services depend on 'app' being successfully initialized.
// If 'app' is undefined due to an earlier critical error, these lines will throw.
// Using non-null assertion `app!` as Firebase is critical for this app.
// If app could not be initialized, these would fail, which is intended.
const auth: Auth = getAuth(app!);
const storage: FirebaseStorage = getStorage(app!);
const db: Firestore = getFirestore(app!);

export async function uploadPdf(file: File): Promise<string> {
  // The 'storage' instance should be valid if module initialization was successful.
  if (!storage) {
    console.error("Firebase Storage is not available for uploadPdf. Initialization might have failed.");
    throw new Error("Firebase Storage is not initialized.");
  }
  if (!file || file.type !== "application/pdf") {
    throw new Error("Invalid file type. Only PDF is allowed.");
  }

  const fileName = `${uuidv4()}-${file.name}`;
  // Use the aliased firebaseStorageRef for clarity and to avoid conflicts
  const fileRef = firebaseStorageRef(storage, `quizzes_pdfs/${fileName}`);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    // snapshot.ref is the correct StorageReference to pass to getDownloadURL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    // Augment error or re-throw as appropriate
    throw new Error(`Failed to upload PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export { app, auth, storage, db };
