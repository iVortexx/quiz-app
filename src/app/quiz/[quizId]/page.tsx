
"use client"

import {useState, useEffect, useCallback} from "react"
import {useRouter, useParams} from "next/navigation"
import Link from "next/link";
import {QuizifyButton} from "@/components/custom/Quizify-button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group"
import {Label} from "@/components/ui/label"
import {Progress} from "@/components/ui/progress"
import {Clock, ChevronLeft, ChevronRight, Loader2} from "lucide-react"
import type { QuizData } from "@/src/ai/flows/create-quiz-flow"
import { cn } from "@/lib/utils";
import { db } from "@/src/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context"; 
import toast from "react-hot-toast";

export default function QuizPage() {
    const router = useRouter(); 
    const params = useParams<{ quizId: string; }>(); 
    const { user, loading: authLoading } = useAuth(); 

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [timeLeft, setTimeLeft] = useState(1800) // 30 minutes
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(true); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const currentQuizId = params.quizId;
        console.log("QuizPage: Attempting to load quiz with quizId from params:", currentQuizId);
        if (currentQuizId) { 
            const fetchQuiz = async () => {
                setIsLoadingQuiz(true);
                try {
                    const quizDocRef = doc(db, "quizzes", currentQuizId as string); 
                    const quizDocSnap = await getDoc(quizDocRef);

                    if (quizDocSnap.exists()) {
                        setQuiz({ id: quizDocSnap.id, ...quizDocSnap.data() } as QuizData);
                        setAnswers({});
                        console.log("QuizPage: Quiz loaded successfully:", quizDocSnap.id);
                    } else {
                        setQuiz(null);
                        toast.error("Quiz not found.");
                        console.error("QuizPage: Quiz not found in Firestore for ID:", currentQuizId);
                    }
                } catch (error) {
                    console.error("QuizPage: Error fetching quiz from Firestore:", error);
                    toast.error("Failed to load quiz.");
                    setQuiz(null);
                }
                setIsLoadingQuiz(false);
            };
            fetchQuiz();
        } else {
            setIsLoadingQuiz(false); 
            setQuiz(null);
            // toast.error("Quiz ID is missing from URL."); // Only show if params.quizId was truly undefined
            console.error("QuizPage: quizId is missing from URL params (params.quizId was falsy). Current params:", params);
        }
    }, [params.quizId, params]);  // Added params to dependency array

    const handleSubmitQuiz = useCallback(async () => {
        if (!quiz || isSubmitting || !user) {
            console.warn("handleSubmitQuiz: Aborted. Quiz not loaded, already submitting, or user not logged in.");
            return;
        }
        setIsSubmitting(true);
        toast.loading("Submitting your answers...", { id: "submit-toast"});

        try {
            let correct = 0
            quiz.questions.forEach((question) => {
                if (answers[question.id] === question.correctAnswerIndex) {
                    correct++
                }
            })
            const score = Math.round((correct / quiz.questions.length) * 100)

            const resultData = {
                quizId: quiz.id, 
                userId: user.uid, 
                answers,
                score,
                correct,
                total: quiz.questions.length,
                questionsSnapshot: quiz.questions, 
                quizTitle: quiz.title,
                submittedAt: serverTimestamp(),
            };

            const resultDocRef = await addDoc(collection(db, "quizResults"), resultData);
            toast.dismiss("submit-toast");
            toast.success("Quiz submitted! Taking you to results...");
            
            const targetUrl = `/quiz/${quiz.id}/results/${resultDocRef.id}`;
            console.log(`QuizPage: Attempting to navigate to results page: ${targetUrl}`);
            
            setTimeout(() => {
                router.push(targetUrl);
            }, 300);

        } catch (error) {
            console.error("QuizPage: Error submitting quiz results:", error);
            toast.dismiss("submit-toast");
            toast.error("Failed to submit your results. Please try again.");
            setIsSubmitting(false);
        }
    }, [quiz, isSubmitting, user, answers, router]);

    useEffect(() => {
        if (!quiz || isLoadingQuiz || isSubmitting || authLoading || !user) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!isSubmitting) handleSubmitQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [quiz, isLoadingQuiz, isSubmitting, authLoading, user, handleSubmitQuiz]);

    const handleAnswerChange = (questionId: string, answerIndex: number) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: answerIndex,
        }))
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    if (authLoading || isLoadingQuiz || (!authLoading && !user && !isLoadingQuiz)) { 
        return (
            <div className="min-h-screen bg-background py-8 flex justify-center items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!quiz) { 
        return (
             <div className="min-h-screen bg-background py-8 flex flex-col justify-center items-center text-center px-4">
                <h2 className="text-2xl font-bold text-foreground mb-4">Quiz Not Found</h2>
                <p className="text-muted-foreground mb-4">This quiz may not exist, has been removed, or the ID is incorrect.</p>
                <Link href="/my-quizzes">
                    <QuizifyButton variant="threed">Go to My Quizzes</QuizifyButton>
                </Link>
            </div>
        );
    }
    
    const currentQuestionData = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100

    return (
        <div className="min-h-screen bg-background py-8">
            {isSubmitting && (
                <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex flex-col justify-center items-center z-[100] p-4 text-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Finalizing Your Quiz</h2>
                    <p className="text-lg text-muted-foreground">Calculating score and preparing results...</p>
                </div>
            )}

            <div className={cn(
                "max-w-4xl mx-auto px-4 transition-all duration-300",
                isSubmitting ? 'blur-md pointer-events-none opacity-50' : 'blur-none opacity-100'
            )}>
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-foreground">{quiz.title}</h1>
                        <div className="flex items-center space-x-2 text-lg font-medium text-muted-foreground">
                            <Clock className="h-5 w-5 text-primary"/>
                            <span
                                className={timeLeft < 300 ? "text-destructive" : ""}>{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                    <Progress value={progress} className="w-full h-2.5"/>
                    <p className="text-sm text-muted-foreground mt-2">
                        Question {currentQuestionIndex + 1} of {quiz.questions.length}
                    </p>
                </div>

                <Card className="mb-8 bg-card">
                    <CardHeader>
                        <CardTitle className="text-xl text-card-foreground">{currentQuestionData.questionText}</CardTitle>
                        <CardDescription>Select the best answer from the options below.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={answers[currentQuestionData.id]?.toString() ?? ""}
                            onValueChange={(value) => handleAnswerChange(currentQuestionData.id, Number.parseInt(value))}
                            className="space-y-3"
                        >
                            {currentQuestionData.options.map((option, index) => (
                                <Label 
                                    htmlFor={`option-${currentQuestionData.id}-${index}`} 
                                    key={index}
                                    className={cn("flex items-center space-x-3 p-4 rounded-lg border border-input hover:bg-accent/50 cursor-pointer transition-colors",
                                        answers[currentQuestionData.id] === index ? "bg-primary/10 border-primary ring-2 ring-primary" : ""
                                    )}
                                >
                                    <RadioGroupItem value={index.toString()} id={`option-${currentQuestionData.id}-${index}`}/>
                                    <span className="flex-1 text-foreground">
                                        {option}
                                    </span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>

                <div className="flex justify-between">
                    <QuizifyButton
                        variant="threed"
                        onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0 || isSubmitting}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4"/>
                        Previous
                    </QuizifyButton>

                    {currentQuestionIndex === quiz.questions.length - 1 ? (
                        <QuizifyButton variant="threed" onClick={handleSubmitQuiz} disabled={isSubmitting || !user}>
                             {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Quiz"
                            )}
                        </QuizifyButton>
                    ) : (
                        <QuizifyButton
                            variant="threed"
                            onClick={() => setCurrentQuestionIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
                            disabled={isSubmitting}
                        >
                            Next
                            <ChevronRight className="ml-2 h-4 w-4"/>
                        </QuizifyButton>
                    )}
                </div>
            </div>
        </div>
    )
}
    
