import Link from "next/link"
import { Button } from "@/components/ui/button"
import { QuizifyButton } from "@/components/custom/Quizify-button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Play, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4"><span className="text-violet-600">Q</span>UIZIFY - AI-Powered Quiz Generator ✨</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Transform your PDF documents into interactive quizzes instantly. Upload, generate, and test your knowledge
              with AI-powered questions.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/create-quiz">
                <QuizifyButton size="lg" variant={"threed"}>
                  <Plus className="mr-2 h-5 w-5" />
                  Create Quiz
                </QuizifyButton>
              </Link>
              <Link href="/my-quizzes">
                <QuizifyButton variant="glass" size="lg">
                  <Play className="mr-2 h-5 w-5" />
                  My Quizzes
                </QuizifyButton>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Create custom quizzes from your documents in just a few simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>Upload your PDF document and specify the number of questions you want</CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>AI Generation</CardTitle>
              <CardDescription>
                Our AI analyzes your document and generates relevant quiz questions automatically
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Take & Track</CardTitle>
              <CardDescription>Take your quiz and get detailed results with performance analytics</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
