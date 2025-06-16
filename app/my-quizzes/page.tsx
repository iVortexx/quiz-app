
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { QuizifyButton } from "@/components/custom/Quizify-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Play, FileText, Calendar, Loader2, BookOpenCheck, MoreHorizontal, Share2, Trash2, Edit3, Pin, PinOff } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { QuizData } from "@/src/types/quiz" // Updated import path
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/src/lib/firebase"
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore"
import { deleteQuizAction, renameQuizAction, togglePinQuizAction } from "./actions";
import { Skeleton } from "@/components/ui/skeleton";

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
    const date = new Date(dateInput as string | number | Date);
    if (isNaN(date.getTime())) {
        return "Invalid Date";
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

const QuizCardSkeleton = () => (
  <Card className="flex flex-col bg-card">
    <CardHeader>
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-5/6" />
    </CardHeader>
    <CardContent className="flex-grow space-y-3">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    </CardContent>
    <div className="p-6 pt-0 mt-auto">
      <div className="flex space-x-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
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

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingQuizzes(true);
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
            isPinned: false, // Default for docs without the field
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
      setQuizzes([]);
      setIsLoadingQuizzes(false);
    }
  }, [user, authLoading])

  useEffect(() => {
    if (editingQuizId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingQuizId]);

  const pinnedQuizzes = useMemo(() => quizzes.filter(q => q.isPinned).sort((a, b) => {
      // Optional: Add sophisticated sorting for pinned items if needed, e.g. by a pinnedAt timestamp
      // For now, they retain their original fetched order (desc by createdAt)
      return 0; 
  }), [quizzes]);
  const unpinnedQuizzes = useMemo(() => quizzes.filter(q => !q.isPinned), [quizzes]);


  const handleShareQuiz = async (quizId: string, quizTitle: string) => {
    const shareUrl = `${window.location.origin}/quiz/${quizId}`;
    const shareData = {
      title: `Quiz: ${quizTitle}`,
      text: `Check out this quiz on Quizify: "${quizTitle}". Challenge yourself!`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Quiz link copied to clipboard!");
      }
    } catch (error: unknown) {
      // Consolidating error handling for share
      const fallbackCopy = async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Sharing failed or unavailable. Link copied to clipboard instead!");
        } catch (copyError) {
          console.error("Error copying link to clipboard after share/copy failure:", copyError);
          toast.error("Could not share or copy link. Please try again manually.");
        }
      };
      if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError')) {
        console.log("Share operation cancelled by user or not allowed, attempting copy.");
        await fallbackCopy();
      } else {
        console.error("Unexpected error during sharing:", error);
        await fallbackCopy();
      }
    }
  };

  const handleDeleteQuiz = async (quizIdToDelete: string) => {
    if (!user) {
      toast.error("You must be logged in to delete a quiz.");
      return;
    }
    if (isConfirmingDelete === quizIdToDelete || isDeleting === quizIdToDelete) return;
    setIsConfirmingDelete(quizIdToDelete);
    setIsDeleting(quizIdToDelete);
    const toastId = `delete-${quizIdToDelete}`;
    toast.loading("Deleting quiz...", { id: toastId });
    try {
      const idToken = await user.getIdToken(true);
      if (!idToken) {
        throw new Error("Could not get authentication token.");
      }
      const result = await deleteQuizAction(quizIdToDelete, idToken);
      if (result.success) {
        toast.dismiss(toastId);
        toast.success(result.message || "Quiz deleted successfully!");
        setQuizzes(prevQuizzes => prevQuizzes.filter(q => q.id !== quizIdToDelete));
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || "Failed to delete quiz.");
      }
    } catch (error: unknown) {
      toast.dismiss(toastId);
      let clientErrorMessage = "An unexpected error occurred while deleting the quiz.";
      if ((error as { code?: string })?.code === 'auth/requires-recent-login') {
        clientErrorMessage = "This operation requires a recent sign-in. Please sign out and sign back in.";
      } else if (error instanceof Error) { clientErrorMessage = error.message; }
      toast.error(clientErrorMessage);
    } finally {
      setIsDeleting(null); setIsConfirmingDelete(null);
    }
  };

  const handleStartEdit = (quiz: QuizData) => {
    setEditingQuizId(quiz.id);
    setEditingTitle(quiz.title);
  };

  const handleSaveTitle = async (quizId: string) => {
    if (!user) {
      toast.error("You must be logged in to rename a quiz.");
      setEditingQuizId(null);
      return;
    }
    const originalQuiz = quizzes.find(q => q.id === quizId);
    if (!originalQuiz || editingTitle.trim() === "" || editingTitle.trim() === originalQuiz.title) {
      setEditingQuizId(null); 
      return;
    }

    setIsRenaming(quizId);
    const toastId = `rename-${quizId}`;
    toast.loading("Renaming quiz...", { id: toastId });

    try {
      const idToken = await user.getIdToken(true);
      if (!idToken) {
        throw new Error("Could not get authentication token.");
      }
      const result = await renameQuizAction(quizId, editingTitle.trim(), idToken);

      if (result.success) {
        toast.dismiss(toastId);
        toast.success(result.message || "Quiz renamed successfully!");
        setQuizzes(prevQuizzes =>
          prevQuizzes.map(q =>
            q.id === quizId ? { ...q, title: editingTitle.trim() } : q
          )
        );
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || "Failed to rename quiz.");
      }
    } catch (error: unknown) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setIsRenaming(null);
      setEditingQuizId(null);
    }
  };
  
  const handleTogglePin = async (quizId: string, newPinState: boolean) => {
    if (!user) {
      toast.error("You must be logged in to pin/unpin a quiz.");
      return;
    }
    setIsTogglingPin(quizId);
    const toastId = `pin-${quizId}`;
    toast.loading(newPinState ? "Pinning quiz..." : "Unpinning quiz...", { id: toastId });

    try {
      const idToken = await user.getIdToken(true);
      if (!idToken) throw new Error("Could not get authentication token.");

      const result = await togglePinQuizAction(quizId, newPinState, idToken);

      if (result.success) {
        toast.dismiss(toastId);
        toast.success(result.message || `Quiz ${newPinState ? 'pinned' : 'unpinned'}!`);
        setQuizzes(prevQuizzes =>
          prevQuizzes.map(q =>
            q.id === quizId ? { ...q, isPinned: newPinState } : q
          )
        );
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || "Failed to update pin status.");
      }
    } catch (error: unknown) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setIsTogglingPin(null);
    }
  };

  const handleTitleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value);
  };

  const handleTitleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, quizId: string) => {
    if (e.key === 'Enter') {
      handleSaveTitle(quizId);
    } else if (e.key === 'Escape') {
      setEditingQuizId(null);
    }
  };

  if (authLoading || (!authLoading && !user)) {
    return (
        <div className="min-h-screen bg-background py-8 flex justify-center items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  const renderQuizCard = (quiz: QuizData, isPinnedSectionCard: boolean) => (
    <Card key={quiz.id} className="hover:shadow-lg transition-shadow flex flex-col bg-card">
      <CardHeader>
        <div className="flex justify-between items-start">
          {editingQuizId === quiz.id ? (
            <Input
              ref={inputRef}
              type="text"
              value={editingTitle}
              onChange={handleTitleInputChange}
              onKeyDown={(e) => handleTitleInputKeyDown(e, quiz.id)}
              onBlur={() => handleSaveTitle(quiz.id)}
              className="text-xl font-semibold mb-1 text-card-foreground flex-grow mr-2 border-primary ring-primary"
              disabled={isRenaming === quiz.id}
            />
          ) : (
            <CardTitle
              className="text-xl font-semibold mb-1 text-card-foreground cursor-pointer hover:text-primary transition-colors"
              onDoubleClick={() => (isRenaming !== quiz.id && isTogglingPin !== quiz.id) && handleStartEdit(quiz)}
            >
              {quiz.title}
            </CardTitle>
          )}
          {isRenaming === quiz.id && <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />}
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
          {quiz.isPinned && !isPinnedSectionCard && <Pin className="h-5 w-5 text-primary" />}
        </div>
      </CardContent>
      <div className="p-6 pt-0 mt-auto">
        <div className="flex space-x-2">
          <Link href={`/quiz/${quiz.id}`} className="flex-1">
            <QuizifyButton variant="threed" className="w-full"  disabled={editingQuizId === quiz.id || isRenaming === quiz.id || isTogglingPin === quiz.id}>
              <Play className="mr-2 h-4 w-4" />
              Start Quiz
            </QuizifyButton>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <QuizifyButton variant="threed" size="icon" disabled={isDeleting === quiz.id || isConfirmingDelete === quiz.id || editingQuizId === quiz.id || isRenaming === quiz.id || isTogglingPin === quiz.id}>
                {(isDeleting === quiz.id || isConfirmingDelete === quiz.id || isTogglingPin === quiz.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
              </QuizifyButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleTogglePin(quiz.id, !quiz.isPinned)} disabled={isTogglingPin === quiz.id}>
                {isTogglingPin === quiz.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (quiz.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />)}
                <span>{quiz.isPinned ? "Unpin" : "Pin"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStartEdit(quiz)} disabled={isRenaming === quiz.id || isTogglingPin === quiz.id}>
                <Edit3 className="mr-2 h-4 w-4" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShareQuiz(quiz.id, quiz.title)} disabled={isTogglingPin === quiz.id}>
                <Share2 className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteQuiz(quiz.id)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                disabled={isDeleting === quiz.id || isConfirmingDelete === quiz.id || isTogglingPin === quiz.id}
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
  );


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
        ) : (
          <>
            {pinnedQuizzes.length > 0 && (
              <div className="mb-10"> 
                <h2 className="text-2xl font-semibold text-foreground mb-4 border-b pb-2">Pinned Quizzes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pinnedQuizzes.map(quiz => renderQuizCard(quiz, true))}
                </div>
              </div>
            )}

            {pinnedQuizzes.length > 0 && unpinnedQuizzes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4 border-b pb-2">Other Quizzes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unpinnedQuizzes.map(quiz => renderQuizCard(quiz, false))}
                </div>
              </div>
            )}
            
            {/* If no pinned quizzes, show all (unpinned) quizzes in a single section without a "Other Quizzes" title */}
            {pinnedQuizzes.length === 0 && unpinnedQuizzes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unpinnedQuizzes.map(quiz => renderQuizCard(quiz, false))}
                </div>
            )}

            {/* Handle case where there are pinned quizzes but NO other unpinned quizzes */}
             {pinnedQuizzes.length > 0 && unpinnedQuizzes.length === 0 && quizzes.length > 0 && (
                <p className="text-muted-foreground text-center py-6">No other unpinned quizzes.</p>
            )}
            
            {quizzes.length === 0 && !isLoadingQuizzes && (
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
          </>
        )}
      </div>
    </div>
  )
}
