
import Link from "next/link"
import Image from "next/image"
import { QuizifyButton } from "@/components/custom/Quizify-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Play, BarChart3 } from "lucide-react" // Keep BarChart3 for now if used as fallback

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
                <QuizifyButton size="lg" variant="threed">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Quiz
                </QuizifyButton>
              </Link>
              <Link href="/my-quizzes">
                <QuizifyButton variant="threed" size="lg">
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
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex flex-row items-center gap-4">
              <div className="flex-1">
                <CardTitle className="mb-2 text-xl font-semibold">Upload PDF</CardTitle>
                <CardDescription>Upload your PDF document and specify the number of questions you want</CardDescription>
              </div>
              <Image
                src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxkb2N1bWVudCUyMHVwbG9hZHxlbnwwfHx8fDE3NDk0ODY4Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Upload PDF"
                width={80}
                height={80}
                className="rounded-lg flex-shrink-0 object-cover"
                data-ai-hint="document upload"
              />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex flex-row items-center gap-4">
              <div className="flex-1">
                <CardTitle className="mb-2 text-xl font-semibold">AI Generation</CardTitle>
                <CardDescription>
                  Our AI analyzes your document and generates relevant quiz questions automatically
                </CardDescription>
              </div>
               <Image
                src="https://images.unsplash.com/photo-1673255745677-e36f618550d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxicmFpbiUyMGFpfGVufDB8fHx8MTc0OTQ4NjgyOHww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="AI Generation"
                width={80}
                height={80}
                className="rounded-lg flex-shrink-0 object-cover"
                data-ai-hint="brain ai"
              />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex flex-row items-center gap-4">
              <div className="flex-1">
                <CardTitle className="mb-2 text-xl font-semibold">Take & Track</CardTitle>
                <CardDescription>Take your quiz and get detailed results with performance analytics</CardDescription>
              </div>
              <Image
                src="https://images.unsplash.com/photo-1543286386-713bdd548da4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxjaGFydCUyMGFuYWx5dGljc3xlbnwwfHx8fDE3NDk0ODY4Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Take & Track"
                width={80}
                height={80}
                className="rounded-lg flex-shrink-0 object-cover"
                data-ai-hint="chart analytics"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
