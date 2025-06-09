"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Share2, FileText, Calendar, Clock } from "lucide-react"

// Mock data for quizzes
const mockQuizzes = [
  {
    id: "1",
    title: "Introduction to Machine Learning",
    description: "Quiz based on ML fundamentals PDF",
    questionCount: 10,
    createdAt: "2024-01-15",
    difficulty: "Medium",
    completed: false,
  },
  {
    id: "2",
    title: "React Best Practices",
    description: "Quiz from React documentation",
    questionCount: 15,
    createdAt: "2024-01-14",
    difficulty: "Advanced",
    completed: true,
    score: 87,
  },
  {
    id: "3",
    title: "Database Design Principles",
    description: "Quiz on database fundamentals",
    questionCount: 8,
    createdAt: "2024-01-13",
    difficulty: "Beginner",
    completed: false,
  },
]

export default function MyQuizzesPage() {
  const [quizzes] = useState(mockQuizzes)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Quizzes</h1>
            <p className="text-gray-600">Manage and take your custom quizzes</p>
          </div>
          <Link href="/create-quiz">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create New Quiz
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{quiz.title}</CardTitle>
                    <CardDescription>{quiz.description}</CardDescription>
                  </div>
                  <Badge className={getDifficultyColor(quiz.difficulty)}>{quiz.difficulty}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>{quiz.questionCount} questions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{quiz.createdAt}</span>
                    </div>
                  </div>

                  {quiz.completed && (
                    <div className="flex items-center space-x-1 text-sm">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">Completed - Score: {quiz.score}%</span>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Link href={`/quiz/${quiz.id}`} className="flex-1">
                      <Button variant="default" className="w-full">
                        <Play className="mr-2 h-4 w-4" />
                        {quiz.completed ? "Retake" : "Start Quiz"}
                      </Button>
                    </Link>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {quizzes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes yet</h3>
            <p className="text-gray-600 mb-4">Create your first quiz by uploading a PDF document</p>
            <Link href="/create-quiz">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Quiz
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
