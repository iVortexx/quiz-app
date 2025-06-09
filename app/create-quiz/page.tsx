"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import toast from "react-hot-toast"

export default function CreateQuizPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [questionCount, setQuestionCount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const router = useRouter()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
    } else {
      toast.error("Please select a PDF file.")
    }
  }

  const handleCreateQuiz = async () => {
    if (!selectedFile || !questionCount) {
      toast.error("Please upload a PDF and enter the number of questions.")
      return
    }

    const count = Number.parseInt(questionCount)
    if (count < 1 || count > 50) {
      toast.error("Please enter a number between 1 and 50.")
      return
    }

    setIsLoading(true)
    setProgress(0)

    // Simulate AI processing with progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + Math.random() * 15
      })
    }, 200)

    // Simulate processing time
    setTimeout(() => {
      clearInterval(progressInterval)
      setProgress(100)

      setTimeout(() => {
        setIsLoading(false)
        toast.success(`Quiz created successfully! Generated ${questionCount} questions.`)
        router.push("/my-quizzes")
      }, 500)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Quiz</h1>
          <p className="text-gray-600">Upload a PDF document and generate a custom quiz</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quiz Configuration</CardTitle>
            <CardDescription>
              Upload your PDF document and specify how many questions you'd like to generate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PDF Upload */}
            <div className="space-y-2">
              <Label htmlFor="pdf-upload">Upload PDF Document</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  {selectedFile ? (
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload PDF or drag and drop</p>
                      <p className="text-xs text-gray-400">PDF files only</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Question Count */}
            <div className="space-y-2">
              <Label htmlFor="question-count">Number of Questions</Label>
              <Input
                id="question-count"
                type="number"
                placeholder="Enter number of questions (1-50)"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                min="1"
                max="50"
              />
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Processing PDF and generating quiz...</span>
                </div>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-gray-500 text-center">
                  This may take a few moments while our AI analyzes your document
                </p>
              </div>
            )}

            {/* Create Button */}
            <Button
              onClick={handleCreateQuiz}
              disabled={!selectedFile || !questionCount || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Quiz...
                </>
              ) : (
                "Create Quiz"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
