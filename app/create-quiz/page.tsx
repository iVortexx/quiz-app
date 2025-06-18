"use client"

import React from "react"
import { useState, useEffect, useTransition, useActionState } from "react"
import { useRouter } from "next/navigation"
import { QuizifyButton } from "@/components/custom/Quizify-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Loader2, AlertCircle, AlertTriangle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import { createQuizAction } from "./actions"
import type { QuizData } from "@/ai/flows/create-quiz-flow"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PDFDocument } from 'pdf-lib';

const initialState: { quiz?: QuizData; pdfStorageUrl?: string; error?: string; message?: string } = {};

export default function CreateQuizPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [questionCount, setQuestionCount] = useState("10")
  const [progressValue, setProgressValue] = useState(0)
  const [isSaving, setIsSaving] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    type: 'file' | 'ai' | 'storage' | 'general' | 'payload';
    message: string;
    details?: string;
  } | null>(null);

  const [isPendingAction, startTransition] = useTransition();
  const [formState, formAction] = useActionState(createQuizAction, initialState);

  // Progress interval ref so we can clear it properly
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setErrorDetails(null);

    if (file) {
      if (file.type === "application/pdf") {
        if (file.size <= 50 * 1024 * 1024) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();

            if (pageCount > 200) {
              setErrorDetails({
                type: 'file',
                message: "PDF is too long",
                details: "Maximum 200 pages allowed. Please split your PDF into smaller sections."
              });
              setSelectedFile(null);
              event.target.value = "";
              return;
            }

            setSelectedFile(file);
            setProgressValue(0);
          } catch (error) {
            console.error("Error reading PDF:", error);
            setErrorDetails({
              type: 'file',
              message: "Error reading PDF",
              details: "Could not verify PDF contents. Please try a different file."
            });
            setSelectedFile(null);
            event.target.value = "";
          }
        } else {
          setErrorDetails({
            type: 'file',
            message: "File is too large",
            details: "Maximum size is 50MB. Please try with a smaller file or split your PDF."
          });
          setSelectedFile(null);
          event.target.value = "";
        }
      } else {
        setErrorDetails({
          type: 'file',
          message: "Invalid file type",
          details: "Please select a PDF file."
        });
        setSelectedFile(null);
        event.target.value = "";
      }
    } else {
      setSelectedFile(null);
    }
  }

  useEffect(() => {
    if (formState?.message && !formState.error && formState.quiz && user) {
      const saveData = async () => {
        setIsSaving(true);
        toast.loading("Saving quiz to database...", { id: "saving-toast" });

        const quizDataFromAI = formState.quiz!;

        const quizToSave = {
          id: quizDataFromAI.id,
          title: quizDataFromAI.title,
          description: quizDataFromAI.description,
          questionCount: quizDataFromAI.questionCount,
          questions: quizDataFromAI.questions,
          userId: user.uid,
          createdAt: serverTimestamp(),
          isPublic: true,
          ...(formState.pdfStorageUrl && { pdfStorageUrl: formState.pdfStorageUrl }),
        };

        try {
          const quizDocRef = doc(db, 'quizzes', quizDataFromAI.id);
          await setDoc(quizDocRef, quizToSave);
          toast.dismiss("saving-toast");
          toast.success('Quiz created and saved successfully!');
          router.push("/my-quizzes");
        } catch (dbError) {
          console.error("Firestore save error:", dbError);
          toast.dismiss("saving-toast");
          toast.error(`Failed to save quiz: ${dbError instanceof Error ? dbError.message : "Unknown database error"}`);
        } finally {
          setIsSaving(false);
        }
      };
      saveData();
    }
    if (formState?.error) {
      toast.error(formState.error);
    }
  }, [formState, router, user]);

  useEffect(() => {
    if (formState?.error) {
      let errorMessage = formState.error;
      let errorType: 'file' | 'ai' | 'storage' | 'general' | 'payload' = 'general';
      let details = '';

      if (errorMessage.includes('Content Too Large') || errorMessage.includes('Request Entity Too Large') || errorMessage.includes('413')) {
        errorType = 'payload';
        errorMessage = "Quiz data is too large.";
        details = "Please reduce the size of your PDF or the number of questions requested.";
      } else if (errorMessage.includes('PDF') || errorMessage.includes('file')) {
        errorType = 'file';
      } else if (errorMessage.includes('AI') || errorMessage.includes('generation')) {
        errorType = 'ai';
      } else if (errorMessage.includes('Storage') || errorMessage.includes('upload')) {
        errorType = 'storage';
      }

      if (errorType !== 'payload' && errorMessage.includes(':')) {
        const [mainMessage, detail] = errorMessage.split(':');
        details = detail.trim();
        errorMessage = mainMessage.trim();
      }

      setErrorDetails({
        type: errorType,
        message: errorMessage,
        details
      });
    }
  }, [formState?.error]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast.error("You must be logged in to create a quiz.");
      router.push('/login');
      return;
    }
    if (!selectedFile || !questionCount) {
      toast.error("Please upload a PDF and enter the number of questions.")
      return
    }
    const count = Number.parseInt(questionCount)
    if (count < 1 || count > 50) {
      toast.error("Please enter a number between 1 and 50.")
      return
    }

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);
    formData.append('questionCount', questionCount);
    formData.append('userId', user.uid);

    // Reset progress and clear any existing interval
    setProgressValue(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Start new interval for progress animation
    progressIntervalRef.current = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 90) {
          return 90; // Cap at 90% while waiting for server response
        }
        return prev + Math.random() * 10;
      });
    }, 300);

    startTransition(() => {
      formAction(formData);
    });
  };

  // Effect to handle progress completion
  useEffect(() => {
    if (!isPendingAction) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (formState?.quiz) {
        // If we have quiz data, set to 100% (saving will handle its own progress)
        setProgressValue(100);
      } else if (formState?.error) {
        // On error, reset progress after a delay
        setTimeout(() => setProgressValue(0), 1000);
      }
    }
  }, [isPendingAction, formState]);

  if (authLoading || (!authLoading && !user)) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isProcessing = isPendingAction || isSaving;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Quiz</h1>
          <p className="text-muted-foreground">Upload a PDF and let AI generate a quiz for you</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Quiz</CardTitle>
            <CardDescription>
              Upload a PDF document to generate a quiz. Keep PDFs concise and limit question count for faster processing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="pdf-upload" className="text-md font-medium">Upload PDF Document</Label>
                <p className="text-muted-foreground text-sm">
                  Max file size: 50MB, max 200 pages. Larger documents may take longer or fail due to processing limits.
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg p-6 text-center transition-all duration-300 ease-in-out",
                  selectedFile
                    ? "border-2 border-solid border-primary bg-primary/10"
                    : "border-2 border-dashed border-input hover:border-primary hover:bg-accent/10"
                )}
              >
                <input id="pdf-upload" name="pdfFile" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" disabled={isProcessing} />
                <label htmlFor="pdf-upload" className={cn("cursor-pointer block w-full py-4", isProcessing ? "cursor-not-allowed opacity-70" : "")}>
                  {selectedFile ? (
                    <div className="flex flex-col items-center justify-center space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
                      <FileText className="h-10 w-10 text-primary" />
                      <div className="text-center sm:text-left">
                        <p className="text-md font-semibold text-foreground">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-md font-medium text-foreground/90">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground mt-1">PDF files only (max 50MB)</p>
                    </div>
                  )}
                </label>
              </div>

              {errorDetails && (
                <Alert variant={errorDetails.type === 'general' ? 'destructive' : 'default'} className={cn(
                  errorDetails.type === 'file' && 'border-yellow-500 bg-yellow-500/10',
                  errorDetails.type === 'ai' && 'border-orange-500 bg-orange-500/10',
                  errorDetails.type === 'storage' && 'border-red-500 bg-red-500/10',
                  errorDetails.type === 'payload' && 'border-purple-600 bg-purple-600/10 dark:border-purple-400 dark:bg-purple-400/10'
                )}>
                  {errorDetails.type === 'file' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  {errorDetails.type === 'ai' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                  {errorDetails.type === 'storage' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {errorDetails.type === 'payload' && <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                  {errorDetails.type === 'general' && <AlertCircle className="h-4 w-4" />}
                  <AlertTitle className={cn(
                    errorDetails.type === 'file' && 'text-yellow-500',
                    errorDetails.type === 'ai' && 'text-orange-500',
                    errorDetails.type === 'storage' && 'text-red-500',
                    errorDetails.type === 'payload' && 'text-purple-600 dark:text-purple-400'
                  )}>
                    {errorDetails.message}
                  </AlertTitle>
                  {errorDetails.details && (
                    <AlertDescription className={cn(
                      errorDetails.type === 'file' && 'text-yellow-500/80',
                      errorDetails.type === 'ai' && 'text-orange-500/80',
                      errorDetails.type === 'storage' && 'text-red-500/80',
                      errorDetails.type === 'payload' && 'text-purple-600/80 dark:text-purple-400/80'
                    )}>
                      {errorDetails.details}
                    </AlertDescription>
                  )}
                </Alert>
              )}

              <div className="space-y-3">
                <Label htmlFor="question-count" className="text-md font-medium">Number of Questions</Label>
                <Input
                  id="question-count"
                  name="questionCount"
                  type="number"
                  placeholder="Enter number of questions (1-50)"
                  value={questionCount}
                  onChange={(e) => {
                    setQuestionCount(e.target.value);
                    setErrorDetails(null);
                  }}
                  min="1"
                  max="50"
                  className="py-3"
                  disabled={isProcessing}
                />
              </div>

              {(isPendingAction || isSaving) && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-md text-muted-foreground">
                      {isPendingAction ? "Generating quiz content..." : "Saving quiz to database..."}
                    </span>
                  </div>
                  <Progress value={progressValue} className="w-full h-2.5" />
                </div>
              )}

              <QuizifyButton
                type="submit"
                variant="threed"
                className="w-full"
                disabled={isProcessing || !selectedFile || !questionCount}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isPendingAction ? "Generating Quiz..." : "Saving Quiz..."}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Quiz
                  </>
                )}
              </QuizifyButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}