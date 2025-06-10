
'use server';

import { z } from 'genkit';
import { createQuiz, type CreateQuizInput, type QuizData } from '@/src/ai/flows/create-quiz-flow';
import { uploadPdf } from '@/src/lib/firebase';

// Helper function to convert File to Data URI
async function fileToDataUri(file: File): Promise<string> {
  console.log(`fileToDataUri: Starting conversion for file ${file.name}, size ${file.size}, type ${file.type}`);
  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log(`fileToDataUri: ArrayBuffer created, length ${arrayBuffer.byteLength}`);
    const buffer = Buffer.from(arrayBuffer);
    console.log(`fileToDataUri: Buffer created, length ${buffer.length}`);
    const base64String = buffer.toString('base64');
    console.log(`fileToDataUri: Base64 string created, length ${base64String.length}`);
    const dataUri = `data:${file.type};base64,${base64String}`;
    console.log(`fileToDataUri: Data URI created, length ${dataUri.length}. Preview (first 100 chars): ${dataUri.substring(0,100)}`);
    return dataUri;
  } catch (conversionError: any) {
    console.error("fileToDataUri: CRITICAL ERROR during file to Data URI conversion:", conversionError);
    console.error("Conversion Error Name:", conversionError?.name);
    console.error("Conversion Error Message:", conversionError?.message);
    console.error("Conversion Error Stack:", conversionError?.stack);
    // Rethrow a new error with a clear message to be caught by the action's main try/catch
    throw new Error(`Failed to convert file to Data URI: ${conversionError?.message || 'Unknown conversion error.'} This often indicates an out-of-memory issue with large files.`);
  }
}

export async function createQuizAction(
  prevState: any,
  formData: FormData,
): Promise<{ quiz?: QuizData; pdfStorageUrl?: string; error?: string; message?: string }> {
  console.log("createQuizAction: Server action started.");
  const file = formData.get('pdfFile') as File | null;
  const questionCountStr = formData.get('questionCount') as string | null;
  const userId = formData.get('userId') as string | null;

  try {
    console.log("createQuizAction: Initial checks...");
    if (!userId) {
      console.error("createQuizAction: Error - User not authenticated for action.");
      return { error: 'User not authenticated for action.' };
    }
    if (!file) {
      console.error("createQuizAction: Error - No PDF file uploaded.");
      return { error: 'No PDF file uploaded.' };
    }
    if (file.type !== 'application/pdf') {
      console.error("createQuizAction: Error - Invalid file type. Only PDF is allowed. Type:", file.type);
      return { error: 'Invalid file type. Only PDF is allowed.' };
    }
    if (file.size > 10 * 1024 * 1024) { // Max 10MB
      console.error("createQuizAction: Error - File is too large. Maximum size is 10MB. File size:", file.size);
      return { error: "File is too large. Maximum size is 10MB." };
    }
    if (!questionCountStr) {
      console.error("createQuizAction: Error - Number of questions not specified.");
      return { error: 'Number of questions not specified.' };
    }

    const questionCount = parseInt(questionCountStr, 10);
    if (isNaN(questionCount) || questionCount < 1 || questionCount > 50) {
      console.error("createQuizAction: Error - Invalid number of questions. Must be between 1 and 50. Value:", questionCountStr);
      return { error: 'Invalid number of questions. Must be between 1 and 50.' };
    }
    console.log(`createQuizAction: File details - Name: ${file.name}, Size: ${file.size}, Type: ${file.type}. Question count: ${questionCount}`);
    console.log("createQuizAction: Initial checks passed.");

    let pdfDataUri: string;
    console.log("createQuizAction: Attempting file-to-data-URI conversion...");
    const conversionStartTime = Date.now();
    try {
      pdfDataUri = await fileToDataUri(file); // This can throw, caught by main try-catch
      const conversionDuration = Date.now() - conversionStartTime;
      console.log(`createQuizAction: File successfully converted to data URI in ${conversionDuration}ms. Data URI length: ${pdfDataUri.length}`);
    } catch (conversionErrorCaughtInAction) {
      // This catch is specifically for errors re-thrown by fileToDataUri and caught here.
      // The error is already logged in detail by fileToDataUri.
      console.error("createQuizAction: Caught error from fileToDataUri. Will return error to client.");
      // The re-thrown error from fileToDataUri should be specific enough.
      // This will be caught by the main try-catch and processed.
      throw conversionErrorCaughtInAction; 
    }
    console.log("createQuizAction: File-to-data-URI conversion process completed in action.");


    let pdfStorageUrlFromUpload: string | undefined;
    console.log("createQuizAction: Attempting PDF upload to Firebase Storage...");
    const uploadStartTime = Date.now();
    try {
      pdfStorageUrlFromUpload = await uploadPdf(file);
      const uploadDuration = Date.now() - uploadStartTime;
      console.log(`createQuizAction: PDF uploaded successfully to Firebase Storage in ${uploadDuration}ms. URL:`, pdfStorageUrlFromUpload);
    } catch (uploadError: any) {
      console.warn('createQuizAction: PDF upload to Firebase Storage failed (non-fatal for AI). Name:', uploadError?.name, 'Message:', uploadError?.message, 'Stack:', uploadError?.stack?.substring(0, 500));
    }
    console.log("createQuizAction: PDF upload to Firebase Storage process completed.");


    console.log("createQuizAction: Attempting Genkit flow call...");
    const flowInput: CreateQuizInput = {
      pdfDataUri,
      questionCount,
      fileName: file.name,
    };

    console.log("createQuizAction: Calling createQuiz Genkit flow with input (details logged in flow):", { questionCount: flowInput.questionCount, fileName: flowInput.fileName, pdfDataUriLength: flowInput.pdfDataUri.length });
    const genkitStartTime = Date.now();
    const generatedQuizFromAI = await createQuiz(flowInput); // This can throw, caught by main try-catch
    const genkitDuration = Date.now() - genkitStartTime;
    console.log(`createQuizAction: Genkit flow call completed in ${genkitDuration}ms.`);

    if (!generatedQuizFromAI || !generatedQuizFromAI.id || !generatedQuizFromAI.questions || generatedQuizFromAI.questions.length === 0) {
      console.error("createQuizAction: Genkit flow returned invalid/empty quiz data. Raw data:", JSON.stringify(generatedQuizFromAI).substring(0,1000));
      return { error: 'AI failed to generate valid quiz content (incomplete/empty). Check server logs.' };
    }
    console.log("createQuizAction: Genkit flow returned valid quiz data. ID:", generatedQuizFromAI.id, "Questions:", generatedQuizFromAI.questions.length);
    console.log("createQuizAction: Genkit flow call process completed.");
    
    return {
        quiz: generatedQuizFromAI,
        pdfStorageUrl: pdfStorageUrlFromUpload,
        message: 'Quiz content generated. Ready for client-side saving.'
    };

  } catch (error: any) {
    console.error('------------------------------------------------------------------');
    console.error('createQuizAction: CRITICAL UNHANDLED ERROR in main try...catch block:');
    console.error('Error Type:', Object.prototype.toString.call(error));
    console.error('Error Name:', error?.name || 'N/A');
    console.error('Error Message:', error?.message || 'No message');
    console.error('Error Stack:', error?.stack ? error.stack.substring(0, 1000) : 'No stack'); // Log first 1000 chars of stack

    let clientErrorMessage = `An unexpected server error occurred. Please try again. If the issue persists with large files, it might be a memory or processing limit. (Error: ${error?.name || 'UnknownError'})`;

    if (error instanceof z.ZodError) {
      clientErrorMessage = `AI response validation error. Please check server logs for details. (ZodError)`;
      console.error('ZodError Details:', JSON.stringify(error.errors, null, 2));
    } else if (error?.message?.includes('Failed to convert file to Data URI')) {
      clientErrorMessage = error.message; // Use the more specific message from fileToDataUri
    } else if (error?.message?.includes('timeout') || error?.message?.includes('deadline')) {
      clientErrorMessage = `AI processing timed out, possibly due to a large/complex document. (TimeoutError)`;
    } else if (error?.message?.includes('AIService')) {
      clientErrorMessage = `An error occurred with the AI service. (AIServiceError: ${error?.message})`;
    }
    
    console.error('Client-facing error message to be returned:', clientErrorMessage);
    console.error('------------------------------------------------------------------');
    return { error: clientErrorMessage };
  }
}
