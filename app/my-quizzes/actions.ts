
'use server';

import { adminDb, verifyIdToken } from "@/src/lib/firebase-admin"; // Use Admin SDK
// Keep client `db` for potential read operations if needed, or remove if adminDb covers all
import { collection, query, where, getDocs, writeBatch, doc, getDoc as getClientDoc } from "firebase/firestore"; 
import { db as clientDb } from "@/src/lib/firebase"; // Client SDK for initial fetch if needed

import { revalidatePath } from "next/cache";

export async function deleteQuizAction(
  quizId: string,
  idToken: string // Expect Firebase ID token from the client
): Promise<{ success?: boolean; error?: string; message?: string }> {
  console.log(`[SERVER ACTION deleteQuizAction] Received request to delete quizId: '${quizId}'`);

  if (!idToken) {
    console.error("[SERVER ACTION deleteQuizAction] Error: Firebase ID Token is missing.");
    return { error: "Authentication token is required." };
  }

  if (!quizId) {
    console.error("[SERVER ACTION deleteQuizAction] Error: Quiz ID is missing.");
    return { error: "Quiz ID is required." };
  }

  if (!adminDb || !verifyIdToken) {
    console.error("[SERVER ACTION deleteQuizAction] Firebase Admin SDK is not initialized. Cannot proceed.");
    return { error: "Server error: Admin SDK not initialized. Please check server configuration." };
  }

  const decodedToken = await verifyIdToken(idToken);
  if (!decodedToken || !decodedToken.uid) {
    console.error("[SERVER ACTION deleteQuizAction] Error: Invalid or unverifiable ID Token.");
    return { error: "Invalid authentication token. Unable to verify user." };
  }
  const currentUserId = decodedToken.uid;
  console.log(`[SERVER ACTION deleteQuizAction] ID Token verified. User UID: '${currentUserId}'`);

  const quizDocRefAdmin = adminDb.doc(`quizzes/${quizId}`);
  let quizOwnerIdFromDb: string | undefined;

  try {
    // Step 1: Verify ownership using Admin SDK (bypasses client rules for this read)
    console.log(`[SERVER ACTION deleteQuizAction] Attempting to fetch quiz document with Admin SDK: quizzes/${quizId}`);
    const quizDocSnapAdmin = await quizDocRefAdmin.get();

    if (!quizDocSnapAdmin.exists) {
      console.warn(`[SERVER ACTION deleteQuizAction] Quiz document quizzes/${quizId} not found (checked with Admin SDK).`);
      return { error: "Quiz not found or already deleted." };
    }
    console.log(`[SERVER ACTION deleteQuizAction] Quiz document quizzes/${quizId} found (Admin SDK).`);

    const quizData = quizDocSnapAdmin.data();
    if (!quizData) {
      console.error(`[SERVER ACTION deleteQuizAction] Quiz document quizzes/${quizId} exists but data is undefined (Admin SDK). This is unexpected.`);
      return { error: "Quiz data is missing or unreadable." };
    }
    quizOwnerIdFromDb = quizData.userId;
    console.log(`[SERVER ACTION deleteQuizAction] Quiz data fetched (Admin SDK). Document owner ID (quizData.userId): '${quizOwnerIdFromDb}', Current action user ID (from token): '${currentUserId}'`);

    if (quizOwnerIdFromDb !== currentUserId) {
      console.error(`[SERVER ACTION deleteQuizAction] Permission denied by action logic. User '${currentUserId}' does not own quiz '${quizId}'. Owner ID from Firestore: '${quizOwnerIdFromDb}'.`);
      return { error: "You do not have permission to delete this quiz." };
    }
    console.log(`[SERVER ACTION deleteQuizAction] Ownership confirmed by action logic (Admin SDK read) for quiz '${quizId}' by user '${currentUserId}'.`);

    // Step 2: Perform deletions using Admin SDK (batched for atomicity)
    const batch = adminDb.batch();

    // Delete the main quiz document
    console.log(`[SERVER ACTION deleteQuizAction] Adding quiz document quizzes/${quizId} to Admin SDK delete batch.`);
    batch.delete(quizDocRefAdmin);

    // Delete associated quiz results owned by this user for this quiz
    console.log(`[SERVER ACTION deleteQuizAction] Querying for related quiz results (Admin SDK) for quizId: '${quizId}' and userId: '${currentUserId}'`);
    const resultsQueryAdmin = adminDb.collection("quizResults")
      .where("quizId", "==", quizId)
      .where("userId", "==", currentUserId);
    
    const resultsSnapshotAdmin = await resultsQueryAdmin.get();
    console.log(`[SERVER ACTION deleteQuizAction] Found ${resultsSnapshotAdmin.docs.length} related quiz results to delete (Admin SDK query).`);

    if (!resultsSnapshotAdmin.empty) {
      resultsSnapshotAdmin.docs.forEach((resultDoc) => {
        console.log(`[SERVER ACTION deleteQuizAction] Adding result document ${resultDoc.id} (owner: ${resultDoc.data().userId || 'N/A'}) to Admin SDK delete batch.`);
        batch.delete(resultDoc.ref);
      });
    } else {
      console.log(`[SERVER ACTION deleteQuizAction] No related quiz results found for quizId '${quizId}' and userId '${currentUserId}' to delete (Admin SDK).`);
    }

    console.log(`[SERVER ACTION deleteQuizAction] Attempting to commit Admin SDK delete batch for quiz and ${resultsSnapshotAdmin.docs.length} results.`);
    await batch.commit();
    console.log(`[SERVER ACTION deleteQuizAction] Successfully committed Admin SDK delete batch.`);

    console.log(`[SERVER ACTION deleteQuizAction] Revalidating path: /my-quizzes`);
    revalidatePath("/my-quizzes");
    console.log(`[SERVER ACTION deleteQuizAction] Quiz '${quizId}' and its associated results deletion process completed using Admin SDK for user '${currentUserId}'.`);
    return { success: true, message: "Quiz and associated results deleted successfully." };

  } catch (error: any) {
    console.error(`[SERVER ACTION deleteQuizAction] Error during Admin SDK operation for quiz '${quizId}':`, error);
    
    let errorMessage = "An unexpected error occurred while deleting the quiz using Admin SDK.";
    let firebaseErrorCode: string | null = error?.code || null; // Admin SDK errors might have a 'code' property directly
    let errorDetails = error?.message || String(error);

    // No need for the extensive PERMISSION_DENIED explanation related to client SDK in server actions,
    // as Admin SDK operates differently. If Admin SDK fails, it's usually a different kind of issue
    // (e.g., Admin SDK not initialized, service account permissions if very restricted, Firestore service issues).
    if (firebaseErrorCode) {
      errorMessage = `Firebase Admin SDK Error (${firebaseErrorCode}): ${errorDetails}`;
    } else {
      errorMessage = `Error: ${errorDetails}`;
    }
    return { error: `Failed to delete quiz: ${errorMessage}` };
  }
}
