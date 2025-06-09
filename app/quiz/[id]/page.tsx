"use client"

import {useState, useEffect} from "react"
import {useRouter} from "next/navigation"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group"
import {Label} from "@/components/ui/label"
import {Progress} from "@/components/ui/progress"
import {Clock, ChevronLeft, ChevronRight} from "lucide-react"
import {useParams} from 'next/navigation'

// Mock quiz data
const mockQuizData = {
    "1": {
        title: "Introduction to Machine Learning",
        questions: [
            {
                id: 1,
                question: "What is the primary goal of supervised learning?",
                options: [
                    "To find hidden patterns in data",
                    "To predict outcomes based on labeled training data",
                    "To reduce the dimensionality of data",
                    "To cluster similar data points",
                ],
                correctAnswer: 1,
            },
            {
                id: 2,
                question: "Which algorithm is commonly used for classification tasks?",
                options: ["K-means clustering", "Principal Component Analysis", "Random Forest", "DBSCAN"],
                correctAnswer: 2,
            },
            {
                id: 3,
                question: "What does overfitting mean in machine learning?",
                options: [
                    "The model performs well on training data but poorly on new data",
                    "The model has too few parameters",
                    "The training process takes too long",
                    "The model cannot learn from the training data",
                ],
                correctAnswer: 0,
            },
            {
                id: 4,
                question: "What is cross-validation used for?",
                options: [
                    "To increase the size of the dataset",
                    "To evaluate model performance and reduce overfitting",
                    "To clean the data",
                    "To visualize the results",
                ],
                correctAnswer: 1,
            },
            {
                id: 5,
                question: "Which metric is commonly used for regression problems?",
                options: ["Accuracy", "Precision", "Mean Squared Error", "F1-score"],
                correctAnswer: 2,
            },
        ],
    },
}

export default function QuizPage() {
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [answers, setAnswers] = useState<Record<number, number>>({})
    const [timeLeft, setTimeLeft] = useState(1800) // 30 minutes
    const router = useRouter()
    const params = useParams<{ id: string; }>()

    const quiz = mockQuizData[params.id as keyof typeof mockQuizData]

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleSubmitQuiz()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    if (!quiz) {
        return <div>Quiz not found</div>
    }

    const handleAnswerChange = (questionId: number, answerIndex: number) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: answerIndex,
        }))
    }

    const handleSubmitQuiz = () => {
        // Calculate score
        let correct = 0
        quiz.questions.forEach((question) => {
            if (answers[question.id] === question.correctAnswer) {
                correct++
            }
        })

        const score = Math.round((correct / quiz.questions.length) * 100)

        // Store results in localStorage for the results page
        localStorage.setItem(
            `quiz-${params.id}-results`,
            JSON.stringify({
                answers,
                score,
                correct,
                total: quiz.questions.length,
                questions: quiz.questions,
            }),
        )

        router.push(`/quiz/${params.id}/results`)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
                        <div className="flex items-center space-x-2 text-lg font-medium">
                            <Clock className="h-5 w-5 text-red-500"/>
                            <span
                                className={timeLeft < 300 ? "text-red-500" : "text-gray-700"}>{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                    <Progress value={progress} className="w-full"/>
                    <p className="text-sm text-gray-600 mt-2">
                        Question {currentQuestion + 1} of {quiz.questions.length}
                    </p>
                </div>

                {/* Question Card */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-xl">{quiz.questions[currentQuestion].question}</CardTitle>
                        <CardDescription>Select the best answer from the options below</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={answers[quiz.questions[currentQuestion].id]?.toString() ?? ""}
                            onValueChange={(value) => handleAnswerChange(quiz.questions[currentQuestion].id, Number.parseInt(value))}
                        >
                            {quiz.questions[currentQuestion].options.map((option, index) => (
                                <div key={index}
                                     className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50">
                                    <RadioGroupItem value={index.toString()} id={`option-${index}`}/>
                                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                                        {option}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                        disabled={currentQuestion === 0}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4"/>
                        Previous
                    </Button>

                    {currentQuestion === quiz.questions.length - 1 ? (
                        <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
                    ) : (
                        <Button
                            onClick={() => setCurrentQuestion((prev) => Math.min(quiz.questions.length - 1, prev + 1))}>
                            Next
                            <ChevronRight className="ml-2 h-4 w-4"/>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
