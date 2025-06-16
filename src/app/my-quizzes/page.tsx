
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { QuizifyButton } from "@/components/custom/Quizify-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Play, FileText, Calendar, Loader2, BookOpenCheck, MoreHorizontal, Share2, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { QuizData } from "@/src/ai/flows/create-quiz-flow"
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/src/lib/firebase"
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore"
import { deleteQuizAction } from "./actions";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

const formatDate = (dateInput: unknown) => {
  if (!dateInput) return "N/A";
  try {
    if (dateInput instanceof Timestamp) {
      return dateInput.toDate().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    // Attempt to parse if it's a string or number, assuming it's a valid date representation
    const date = new Date(dateInput as string | number | Date);
    if (isNaN(date.getTime())) { // Check if date is valid
        // console.warn("Invalid date input to formatDate:", dateInput);
        return "Invalid Date";
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    // console.error("Error formatting date:", e, "Input:", dateInput);
    return "Invalid Date";
  }
};

const QuizCardSkeleton = () => (
  <Card className="flex flex-col bg-card">
    <CardHeader>
      <Skeleton className="h-6 w-3/4 mb-2" /> {/* Title */}
      <Skeleton className="h-4 w-full mb-1" /> {/* Description line 1 */}
      <Skeleton className="h-4 w-5/6" />     {/* Description line 2 */}
    </CardHeader>
    <CardContent className="flex-grow space-y-3">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 w-5 rounded-full" /> {/* Icon */}
        <Skeleton className="h-4 w-24" /> {/* Text */}
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 w-5 rounded-full" /> {/* Icon */}
        <Skeleton className="h-4 w-20" /> {/* Text */}
      </div>
    </CardContent>
    <div className="p-6 pt-0 mt-auto">
      <div className="flex space-x-2">
        <Skeleton className="h-10 flex-1 rounded-xl" /> {/* Button */}
        <Skeleton className="h-10 w-10 rounded-xl" />  {/* Icon Button */}
      </div>
    </div>
  </Card>
);


export default function MyQuizzesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<QuizData[]>([])
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingQuizzes(true); // Set loading true before fetch
      const fetchQuizzes = async () => {
        try {
          const q = query(
            collection(db, "quizzes"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          const querySnapshot = await getDocs(q);
          const userQuizzes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as QuizData));
          setQuizzes(userQuizzes);
        } catch (error) {
          console.error("Error fetching quizzes from Firestore:", error);
          toast.error("Could not load your quizzes.");
        } finally {
            setIsLoadingQuizzes(false);
        }
      };
      fetchQuizzes();
    } else if (!authLoading && !user) {
      setQuizzes([]); // Clear quizzes if user logs out
      setIsLoadingQuizzes(false); // No quizzes to load
    }
  }, [user, authLoading])

  const handleDeleteQuiz = async (quizIdToDelete: string) => {
    if (!user) {
      toast.error("You must be logged in to delete a quiz.");
      return;
    }

    if (isConfirmingDelete === quizIdToDelete || isDeleting === quizIdToDelete) {
      return;
    }

    setIsConfirmingDelete(quizIdToDelete);
    // Directly proceed to deletion as per prior debugging simplifying this.
    // If a modal confirmation was desired, it would be handled here.

    setIsDeleting(quizIdToDelete);
    const toastId = `delete-${quizIdToDelete}`;
    toast.loading("Deleting quiz...", { id: toastId });
    try {
      const idToken = await user.getIdToken(true);
      if (!idToken) {
        toast.dismiss(toastId);
        toast.error("Could not get authentication token. Please try signing out and in again.");
        setIsDeleting(null);
        setIsConfirmingDelete(null);
        return;
      }

      const result = await deleteQuizAction(quizIdToDelete, idToken);

      if (result.success) {
        toast.dismiss(toastId);
        toast.success(result.message || "Quiz deleted successfully!");
        setQuizzes(prevQuizzes => prevQuizzes.filter(q => q.id !== quizIdToDelete));
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || "Failed to delete quiz.");
        console.error(`handleDeleteQuiz: Error from action - ${result.error}`);
      }
    } catch (error: unknown) {
      toast.dismiss(toastId);
      let clientErrorMessage = "An unexpected error occurred while deleting the quiz.";
      if ((error as { code?: string })?.code === 'auth/requires-recent-login') {
        clientErrorMessage = "This operation requires a recent sign-in. Please sign out and sign back in to continue.";
      } else if (error instanceof Error) {
        clientErrorMessage = error.message;
      }
      toast.error(clientErrorMessage);
      console.error("Delete quiz error on client (catch block):", error);
    } finally {
      setIsDeleting(null);
      setIsConfirmingDelete(null);
    }
  };

  // Handles the main page loading state (auth check)
  if (authLoading || (!authLoading && !user)) {
    return (
        <div className="min-h-screen bg-background py-8 flex justify-center items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  // At this point, auth is done and user is present.
  // Now handle quiz loading state vs. content display.
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Quizzes</h1>
          <p className="text-muted-foreground">Manage and take your custom quizzes</p>
        </div>

        {isLoadingQuizzes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <QuizCardSkeleton key={`skeleton-${i}`} />)}
          </div>
        ) : quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow flex flex-col bg-card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-semibold mb-1 text-card-foreground">{quiz.title}</CardTitle>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground h-10 overflow-hidden text-ellipsis">
                    {quiz.description || `A quiz with ${quiz.questionCount} questions.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{quiz.questionCount} questions</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(quiz.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <div className="flex space-x-2">
                    <Link href={`/quiz/${quiz.id}`} className="flex-1">
                      <QuizifyButton variant="threed" className="w-full">
                        <Play className="mr-2 h-4 w-4" />
                        Start Quiz
                      </QuizifyButton>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <QuizifyButton variant="threed" size="icon" disabled={isDeleting === quiz.id || isConfirmingDelete === quiz.id}>
                          {(isDeleting === quiz.id || isConfirmingDelete === quiz.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </QuizifyButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast('Sharing not implemented yet!')}>
                          <Share2 className="mr-2 h-4 w-4" />
                          <span>Share</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          disabled={isDeleting === quiz.id || isConfirmingDelete === quiz.id}
                        >
                          {(isDeleting === quiz.id || isConfirmingDelete === quiz.id) ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
            <BookOpenCheck className="h-20 w-20 text-primary mb-6" />
            <h2 className="text-2xl font-semibold text-foreground mb-3">No Quizzes Yet!</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              It looks like you haven&apos;t created any quizzes. Get started by uploading a PDF.
            </p>
            <Link href="/create-quiz">
              <QuizifyButton variant="threed" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Quiz
              </QuizifyButton>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
