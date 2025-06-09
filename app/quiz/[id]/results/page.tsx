"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RotateCcw, Home, Trophy, Target } from "lucide-react"
import { useParams } from 'next/navigation'

interface QuizResults {
  answers: Record<number, number>
  score: number
  correct: number
  total: number
  questions: Array<{
    id: number
    question: string
    options: string[]
    correctAnswer: number
  }>
}

export default function QuizResultsPage() {
  const [results, setResults] = useState<QuizResults | null>(null)
  const params = useParams<{ id: string; }>()

  useEffect(() => {
    const savedResults = localStorage.getItem(`quiz-${params.id}-results`)
    if (savedResults) {
      setResults(JSON.parse(savedResults))
    }
  }, [params.id])

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No results found</h2>
          <Link href="/my-quizzes">
            <Button>Return to My Quizzes</Button>
          </Link>
        </div>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { text: "Excellent", color: "bg-green-100 text-green-800" }
    if (score >= 80) return { text: "Good", color: "bg-blue-100 text-blue-800" }
    if (score >= 60) return { text: "Fair", color: "bg-yellow-100 text-yellow-800" }
    return { text: "Needs Improvement", color: "bg-red-100 text-red-800" }
  }

  const scoreBadge = getScoreBadge(results.score)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white rounded-full shadow-lg">
              <Trophy className={`h-12 w-12 ${getScoreColor(results.score)}`} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
          <p className="text-gray-600">Here are your results</p>
        </div>

        {/* Score Summary */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold mb-2">
              <span className={getScoreColor(results.score)}>{results.score}%</span>
            </CardTitle>
            <Badge className={scoreBadge.color}>{scoreBadge.text}</Badge>
            <CardDescription className="mt-4">
              You answered {results.correct} out of {results.total} questions correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">{results.correct}</div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-600">{results.total - results.correct}</div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Question Review</h2>
          {results.questions.map((question, index) => {
            const userAnswer = results.answers[question.id]
            const isCorrect = userAnswer === question.correctAnswer

            return (
              <Card key={question.id} className={`border-l-4 ${isCorrect ? "border-l-green-500" : "border-l-red-500"}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex-1">
                      Question {index + 1}: {question.question}
                    </CardTitle>
                    {isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 ml-4" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 ml-4" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isUserAnswer = userAnswer === optionIndex
                      const isCorrectAnswer = question.correctAnswer === optionIndex

                      let className = "p-3 rounded-lg border "
                      if (isCorrectAnswer) {
                        className += "bg-green-50 border-green-200 text-green-800"
                      } else if (isUserAnswer && !isCorrectAnswer) {
                        className += "bg-red-50 border-red-200 text-red-800"
                      } else {
                        className += "bg-gray-50 border-gray-200"
                      }

                      return (
                        <div key={optionIndex} className={className}>
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            <div className="flex space-x-2">
                              {isUserAnswer && (
                                <Badge variant="outline" className="text-xs">
                                  Your Answer
                                </Badge>
                              )}
                              {isCorrectAnswer && (
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                                  Correct
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <Link href={`/quiz/${params.id}`}>
            <Button variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </Link>
          <Link href="/my-quizzes">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Back to My Quizzes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
