
"use client"

import type React from "react"
import { useState, useEffect, useTransition, useActionState } from "react"
import { useRouter } from "next/navigation"
import { QuizifyButton } from "@/components/custom/Quizify-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import { createQuizAction } from "./actions"
import type { QuizData } from "@/src/ai/flows/create-quiz-flow"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/src/lib/firebase" // Import db for client-side write
import { doc, setDoc, serverTimestamp } from "firebase/firestore" // Import Firestore functions

// Updated initial state to reflect changes in action's return type
const initialState: { quiz?: QuizData; pdfStorageUrl?: string; error?: string; message?: string } = {};

export default function CreateQuizPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [questionCount, setQuestionCount] = useState("10")
  const [progressValue, setProgressValue] = useState(0)
  const [isSaving, setIsSaving] = useState(false); // For client-side saving indicator

  const [isPendingAction, startTransition] = useTransition(); // Renamed for clarity
  const [formState, formAction] = useActionState(createQuizAction, initialState);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === "application/pdf") {
        if (file.size <= 10 * 1024 * 1024) { // Max 10MB
          setSelectedFile(file)
          setProgressValue(0);
        } else {
          toast.error("File is too large. Maximum size is 10MB.")
          setSelectedFile(null);
          event.target.value = ""
        }
      } else {
        toast.error("Please select a PDF file.")
        setSelectedFile(null);
        event.target.value = ""
      }
    } else {
      setSelectedFile(null);
    }
  }

 useEffect(() => {
    // This effect handles the result from the server action
    if (formState?.message && !formState.error && formState.quiz && user) {
      // AI part done, now save to Firestore from client
      const saveData = async () => {
        setIsSaving(true);
        toast.loading("Saving quiz to database...", { id: "saving-toast" });

        // Ensure all fields expected by QuizData are present or correctly handled
        const quizDataFromAI = formState.quiz!;
        
        const quizToSave = {
          id: quizDataFromAI.id,
          title: quizDataFromAI.title,
          description: quizDataFromAI.description, // Optional, from AI
          questionCount: quizDataFromAI.questionCount,
          questions: quizDataFromAI.questions,
          userId: user.uid, // Add authenticated user's ID
          createdAt: serverTimestamp(), // Use Firestore server timestamp
          isPublic: true, // Default to public
          // Conditionally add pdfStorageUrl
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
      toast.error(formState.error); // Error from server action (AI generation part)
    }
  }, [formState, router, user]);


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

    let progressInterval: NodeJS.Timeout | undefined;
    if (isPendingAction) { // Use isPendingAction for AI generation progress
        setProgressValue(0);
        progressInterval = setInterval(() => {
        setProgressValue((prev) => {
            if (prev >= 90) {
            clearInterval(progressInterval as NodeJS.Timeout);
            return 90;
            }
            return prev + Math.random() * 10;
        });
        }, 300);
    }

    startTransition(() => {
      formAction(formData); // Call server action
    });
    
    return () => {
        if (progressInterval) clearInterval(progressInterval);
    };
  };
  
  useEffect(() => {
    // This effect manages progress bar based on server action's pending state
    if (!isPendingAction && (formState?.quiz || formState?.error)) { // If action is done (success or error)
        setProgressValue(100); 
        // If successful, saving starts, progress can remain or show saving state
        // If error, progress resets.
        if (formState?.error || (!formState?.quiz && !isSaving)) {
          setTimeout(() => setProgressValue(0), 1000); // Reset progress after error or if no saving happens
        }
    }
  }, [isPendingAction, formState, isSaving]);

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
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Quiz</h1>
          <p className="text-muted-foreground">Upload a PDF document and generate a custom quiz</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quiz Configuration</CardTitle>
            <CardDescription>
              Upload your PDF document and specify how many questions you&apos;d like to generate.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="pdf-upload" className="text-md font-medium">Upload PDF Document</Label>
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
                        <p className="text-sm text-muted-foreground mt-1">PDF files only (max 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="question-count" className="text-md font-medium">Number of Questions</Label>
                <Input
                  id="question-count"
                  name="questionCount"
                  type="number"
                  placeholder="Enter number of questions (1-50)"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  min="1"
                  max="50"
                  className="py-3"
                  disabled={isProcessing}
                />
              </div>

              {isPendingAction && ( // AI generation progress
                <div className="space-y-4 pt-4">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-md text-muted-foreground">Generating quiz content... This may take a moment.</span>
                  </div>
                  <Progress value={progressValue} className="w-full h-2.5" />
                </div>
              )}
              {isSaving && ( // Client-side saving progress
                 <div className="space-y-4 pt-4">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-md text-muted-foreground">Saving quiz to database...</span>
                  </div>
                   {/* Optionally, you can add another progress bar or keep the existing one */}
                  <Progress value={progressValue < 100 ? 95 : 100} className="w-full h-2.5" />
                </div>
              )}


              <QuizifyButton
                type="submit"
                variant="threed"
                size="lg"
                disabled={!selectedFile || !questionCount || isProcessing || !user}
                className="w-full py-3"
              >
                {isPendingAction ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Content...
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving Quiz...
                  </>
                ) : (
                  "Create Quiz & Get Started!"
                )}
              </QuizifyButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
