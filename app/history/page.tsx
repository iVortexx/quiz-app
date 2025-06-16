"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, BarChartHorizontalBig, AlertTriangle, Percent, ListChecks, CheckCircle, XCircle } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import toast from "react-hot-toast"
import type { QuizQuestion } from "@/ai/flows/create-quiz-flow" // Reusing this type for question structure if needed

interface StoredQuizResult {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  correct: number;
  total: number;
  quizTitle?: string;
  submittedAt: Timestamp; 
  questionsSnapshot?: QuizQuestion[]; // Optional, as it might be heavy
}

interface ChartData {
  name: string;
  score: number;
}

const formatDate = (timestamp: Timestamp | undefined) => {
  if (!timestamp) return "N/A";
  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};


export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [quizResults, setQuizResults] = useState<StoredQuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuizzesTaken: 0,
    averageScore: 0,
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    overallAccuracy: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      const fetchHistory = async () => {
        setIsLoading(true);
        try {
          const q = query(
            collection(db, "quizResults"),
            where("userId", "==", user.uid),
            orderBy("submittedAt", "desc")
          );
          const querySnapshot = await getDocs(q);
          const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredQuizResult));
          setQuizResults(results);

          if (results.length > 0) {
            const totalQuizzes = results.length;
            const totalScoreSum = results.reduce((acc, r) => acc + r.score, 0);
            const avgScore = totalQuizzes > 0 ? Math.round(totalScoreSum / totalQuizzes) : 0;
            const totalQuestions = results.reduce((acc, r) => acc + r.total, 0);
            const totalCorrect = results.reduce((acc, r) => acc + r.correct, 0);
            const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

            setStats({
              totalQuizzesTaken: totalQuizzes,
              averageScore: avgScore,
              totalQuestionsAnswered: totalQuestions,
              totalCorrectAnswers: totalCorrect,
              overallAccuracy: accuracy,
            });

            const recentResultsForChart = results.slice(0, 10).reverse(); // Last 10, reversed for chronological chart
            setChartData(
              recentResultsForChart.map(r => ({
                name: r.quizTitle || `Quiz ${formatDate(r.submittedAt)}`,
                score: r.score,
              }))
            );
          } else {
            setStats({ totalQuizzesTaken: 0, averageScore: 0, totalQuestionsAnswered: 0, totalCorrectAnswers: 0, overallAccuracy: 0 });
            setChartData([]);
          }
        } catch (error) {
          console.error("Error fetching quiz history:", error);
          toast.error("Failed to load quiz history.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            <BarChartHorizontalBig className="mr-3 h-8 w-8 text-primary" /> My Quiz History
          </h1>
          <p className="text-muted-foreground">Review your past quiz performance and statistics.</p>
        </div>

        {quizResults.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl font-semibold text-foreground">No Quiz History Found</p>
              <p className="text-muted-foreground mt-1">You haven&apos;t completed any quizzes yet. Take a quiz to see your history here!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Quizzes Taken</CardTitle>
                  <ListChecks className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalQuizzesTaken}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Percent className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.averageScore}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Correct Answers</CardTitle>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{stats.totalCorrectAnswers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
                  <XCircle className="h-5 w-5 text-red-500" /> 
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">{stats.overallAccuracy}%</div>
                  <p className="text-xs text-muted-foreground">
                    Based on {stats.totalQuestionsAnswered} questions
                  </p>
                </CardContent>
              </Card>
            </div>

            {chartData.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Recent Quiz Scores</CardTitle>
                  <CardDescription>Performance in your last {chartData.length} quizzes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        itemStyle={{ color: "hsl(var(--primary))" }}
                        cursor={{ fill: "hsl(var(--accent))", fillOpacity: 0.5 }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Detailed History</CardTitle>
                <CardDescription>A list of all your completed quizzes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-3 text-left font-medium text-muted-foreground">Quiz Title</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">Score</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">Correct/Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizResults.map((result) => (
                        <tr key={result.id} className="border-b hover:bg-accent/50">
                          <td className="p-3 text-foreground">{result.quizTitle || "Untitled Quiz"}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(result.submittedAt)}</td>
                          <td className="p-3 text-right font-semibold text-primary">{result.score}%</td>
                          <td className="p-3 text-right text-muted-foreground">{result.correct}/{result.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
