
"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { auth } from "@/src/lib/firebase"
import { signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuizifyButton } from "@/components/custom/Quizify-button"
import { UserCircle, LogOut, Loader2, Sun, Moon, Laptop } from "lucide-react"
import toast from "react-hot-toast"
import { useState, useEffect } from "react";
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [creationDate, setCreationDate] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.metadata?.creationTime) {
      const date = new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      setCreationDate(date);
    }
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (authLoading || (!authLoading && !user)) {
    return (
      <div className="min-h-screen bg-background py-8 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 flex flex-col items-center">
      <div className="max-w-md w-full px-4 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">My Profile</h1>
        </div>

        <Card className="w-full shadow-xl">
          <CardHeader className="items-center text-center p-8">
            <Avatar className="h-32 w-32 border-4 border-primary/80 p-1 shadow-lg bg-background mx-auto mb-4">
              {user?.photoURL && (
                  <AvatarImage
                      className="rounded-full"
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      data-ai-hint="user avatar"
                  />
              )}
              <AvatarFallback className="text-5xl font-semibold text-primary bg-muted/30">
                {user?.displayName ? (
                  user.displayName.substring(0, 2).toUpperCase()
                ) : (
                  <UserCircle className="h-20 w-20 text-primary/70" />
                )}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="text-3xl font-bold">{user?.displayName || "Quiz Taker"}</CardTitle>
              <CardDescription className="text-md text-muted-foreground mt-1">
                {user?.email || "Email not available"}
              </CardDescription>
              {creationDate && (
                <p className="text-xs text-muted-foreground/80 mt-2">
                  Joined on {creationDate}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-8 pt-6 pb-8 space-y-6">
            <div className="space-y-3">
              
              <div className="flex space-x-2">
                <QuizifyButton
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme("light")}
                  className={cn("flex-1", theme === "light" && "ring-2 ring-primary border-primary")}
                >
                  <Sun className="mr-2 h-4 w-4" /> Light
                </QuizifyButton>
                <QuizifyButton
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className={cn("flex-1", theme === "dark" && "ring-2 ring-primary border-primary")}
                >
                  <Moon className="mr-2 h-4 w-4" /> Dark
                </QuizifyButton>
                <QuizifyButton
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme("system")}
                  className={cn("flex-1", theme === "system" && "ring-2 ring-primary border-primary")}
                >
                  <Laptop className="mr-2 h-4 w-4" /> System
                </QuizifyButton>
              </div>
            </div>

            <QuizifyButton
              variant="threed"
              className="w-full bg-red-600 hover:bg-red-700 border-b-red-800 hover:border-b-red-900 text-white"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
              {isLoggingOut ? "Logging out..." : "Logout"}
            </QuizifyButton>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
