
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, type FirebaseError } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { QuizifyButton } from '@/components/custom/Quizify-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Simple Google Icon SVG as a component
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.5,18.33 21.5,12.33C21.5,11.76 21.35,11.1 21.35,11.1Z" />
  </svg>
);


export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/profile');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    console.log("Attempting Google Sign-In. Firebase auth object:", auth); // Added log
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully!');
      router.push('/my-quizzes'); // Redirect after successful login
    } catch (error) {
      const firebaseError = error as FirebaseError; // Type assertion
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        // This is a common user action, not an unexpected application error.
        // console.log('Sign-in popup closed by user.'); 
        toast.error('Sign-in cancelled. The sign-in window was closed.');
      } else if (firebaseError.code === 'auth/cancelled-popup-request') {
        // console.log('Sign-in popup request cancelled.'); 
        toast.error('Sign-in cancelled. Multiple sign-in windows were opened.');
      } else {
        // For other, unexpected Firebase errors, log it as an error.
        console.error('Unexpected error signing in with Google:', error);
        toast.error(firebaseError.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full px-4">
        <Card className="w-full shadow-xl">
          <CardHeader className="items-center text-center">
            <LogIn className="h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-semibold">Login to Quizify</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Access your quizzes and create new ones by signing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-8">
            <QuizifyButton
              variant="threed"
              className="w-full py-3 text-lg"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {isSigningIn ? 'Signing In...' : 'Sign in with Google'}
            </QuizifyButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
