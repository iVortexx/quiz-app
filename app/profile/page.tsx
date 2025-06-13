"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { auth } from "@/src/lib/firebase"
import { signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuizifyButton } from "@/components/custom/Quizify-button"
import { UserCircle, LogOut, /* Settings, */ Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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
      <div className="max-w-md w-full px-4">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">My Profile</h1>
        </div>

        <Card className="w-full shadow-xl">
          <CardHeader className="items-center text-center p-8">
            <Avatar className="h-24 w-24 mb-4 border-2 border-primary p-1 mx-auto">
              {user?.photoURL ? (
                  <AvatarImage
                      className="rounded-full"
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      data-ai-hint="user avatar"
                  />
              ) : (
                <UserCircle className="h-full w-full text-muted-foreground" />
              )}
              <AvatarFallback className="text-3xl">
                {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : <UserCircle />}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-bold mb-1">{user?.displayName || "User"}</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {user?.email || "No email provided"}
            </CardDescription>
            {creationDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Joined on {creationDate}
              </p>
            )}
          </CardHeader>
          <CardContent className="px-8 pt-6 pb-8">
            <div className="flex flex-col space-y-6">
{/*               <Link href="/account-settings" passHref>
                <QuizifyButton variant="neon" className="w-full">
                  <Settings className="mr-2 h-5 w-5" />
                  Account Settings
                </QuizifyButton>
              </Link> */}
              <QuizifyButton
                variant="threed"
                className="w-full bg-red-600 hover:bg-red-700 border-b-red-800 hover:border-b-red-900"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
                {isLoggingOut ? "Logging out..." : "Logout"}
              </QuizifyButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
