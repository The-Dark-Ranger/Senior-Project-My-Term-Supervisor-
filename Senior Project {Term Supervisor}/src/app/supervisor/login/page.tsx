
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { UserCog, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link'; // Keep for "Contact Admin" if it becomes a link
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';

export default function SupervisorLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuthError = (error: FirebaseError) => {
    let message = "An unexpected error occurred. Please try again.";
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': // Added this case
        message = "Invalid email or password.";
        break;
      case 'auth/invalid-email':
        message = "Please enter a valid email address.";
        break;
      case 'auth/configuration-not-found':
        message = "Firebase authentication is not configured correctly. Please ensure Email/Password sign-in is enabled in your Firebase project console.";
        break;
      default:
        console.error("Firebase auth error:", error);
    }
    toast({ title: "Login Failed", description: message, variant: "destructive" });
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
     if (!email || !password) {
      toast({ title: "Missing Fields", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // For supervisors, name might come from a separate profile or be their email initially
      localStorage.setItem('loggedInUser', JSON.stringify({ 
        type: 'supervisor', 
        name: user.displayName || user.email?.split('@')[0] || 'Supervisor User', 
        uid: user.uid,
        email: user.email 
      }));
      toast({ title: "Login Successful", description: "Welcome to your dashboard." });
      router.push('/supervisor/dashboard');
    } catch (error) {
      handleAuthError(error as FirebaseError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setResetEmail(email); // Pre-fill with current email if available
    setShowForgotPasswordDialog(true);
  };

  const handleSendResetLink = async () => {
    if (!resetEmail) {
      toast({ title: "Email Required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${resetEmail}, a password reset link has been sent.`,
      });
      setShowForgotPasswordDialog(false);
      setResetEmail('');
    } catch (error) {
      let message = "Failed to send reset email. Please try again.";
      if ((error as FirebaseError).code === 'auth/user-not-found') {
          message = `No account found for ${resetEmail}. Please ensure you are using your registered supervisor email.`;
      } else if ((error as FirebaseError).code === 'auth/invalid-email'){
          message = "Please enter a valid email address.";
      } else if ((error as FirebaseError).code === 'auth/configuration-not-found') {
          message = "Firebase authentication is not configured correctly for password resets. Please check your Firebase project console.";
      }
      toast({ title: "Password Reset Failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleContactAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
        title: "Contact Administrator",
        description: "Please contact your institution's IT department or the Term Supervisor administrator to create or manage supervisor accounts.",
        duration: 5000,
    });
  };


  return (
    <>
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)] sm:min-h-[calc(100vh-200px)] py-12 bg-gradient-to-br from-background to-muted/30 px-4">
        <Card className="w-full max-w-sm sm:max-w-md shadow-xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-2 sm:space-y-3 text-center pb-4 sm:pb-6 pt-6 sm:pt-8">
            <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-primary/10 rounded-full mx-auto mb-2 sm:mb-3 shadow-md">
              <UserCog className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">Supervisor Portal Login</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Access tools to guide and oversee student progress.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-5 sm:space-y-6 px-5 sm:px-6 md:px-8">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="supervisor-email" className="text-sm sm:text-base">Email</Label>
                <Input 
                  id="supervisor-email" 
                  type="email" 
                  placeholder="supervisor@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="py-4 sm:py-5 text-sm sm:text-base"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="supervisor-password" className="text-sm sm:text-base">Password</Label>
                  <a href="#" onClick={handleForgotPasswordClick} className="text-xs sm:text-sm text-primary hover:underline">Forgot password?</a>
                </div>
                <Input 
                  id="supervisor-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="py-4 sm:py-5 text-sm sm:text-base"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:gap-4 pt-5 sm:pt-6 pb-6 sm:pb-8 px-5 sm:px-6 md:px-8">
              <Button type="submit" className="w-full text-md sm:text-lg py-5 sm:py-6" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Login'}
              </Button>
              <p className="text-center text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-2">
                  Accessing for the first time? <a href="#" onClick={handleContactAdminClick} className="text-primary hover:underline font-semibold">Contact Admin</a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Dialog open={showForgotPasswordDialog} onOpenChange={setShowForgotPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Mail className="h-6 w-6 text-primary" />
              Forgot Your Password?
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm sm:text-base">
              Enter your email address below and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email-supervisor" className="text-sm sm:text-base">Email Address</Label>
              <Input
                id="reset-email-supervisor"
                type="email"
                placeholder="supervisor@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="text-sm sm:text-base"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="lg" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSendResetLink} size="lg" disabled={isLoading}>
               {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Reset Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
