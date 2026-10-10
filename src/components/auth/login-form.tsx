'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, LogIn, Mail, UserCog, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/auth/demo-backend';
import { MIN_PASSWORD_LENGTH, authErrorMessage } from '@/lib/auth/types';
import type { Role } from '@/types';

const DASHBOARD: Record<Role, string> = { student: '/student/dashboard', supervisor: '/supervisor/dashboard' };

export default function LoginForm({ portal }: { portal: Role }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, mode, signIn, signUp, resetPassword } = useAuth();

  const canSignUp = portal === 'student';
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [year, setYear] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);

  // Already signed in with the right role? Go straight to the dashboard.
  useEffect(() => {
    if (!loading && user?.role === portal) router.replace(DASHBOARD[portal]);
  }, [loading, user, portal, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (isSignUp && name.trim().length < 2) return setError('Please enter your full name.');
    if (isSignUp && password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    setSubmitting(true);
    try {
      const signedIn = isSignUp
        ? await signUp({ name, email, password, year: Number(year) })
        : await signIn(email, password, portal);
      toast({
        title: isSignUp ? 'Account created' : 'Welcome back',
        description: isSignUp ? `Welcome, ${signedIn.name}!` : `Signed in as ${signedIn.name}.`,
      });
      router.push(DASHBOARD[portal]);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) return;
    setResetting(true);
    try {
      await resetPassword(resetEmail);
      toast({
        title: 'Check your inbox',
        description: `If an account exists for ${resetEmail.trim()}, a reset link has been sent.`,
      });
      setResetOpen(false);
    } catch (err) {
      toast({ title: 'Password reset failed', description: authErrorMessage(err), variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setIsSignUp(false);
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const demoAccounts = DEMO_ACCOUNTS.filter(a => a.role === portal);
  const Icon = portal === 'supervisor' ? UserCog : isSignUp ? UserPlus : LogIn;
  const title = portal === 'supervisor' ? 'Supervisor Portal' : isSignUp ? 'Create student account' : 'Student Login';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-2 sm:py-8">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/">
          <ArrowLeft /> Back
        </Link>
      </Button>

      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-1 rounded-full bg-primary/10 p-3">
            <Icon className="size-7 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>
            {portal === 'supervisor'
              ? 'Review student plans, approvals and meetings.'
              : isSignUp
                ? 'Start planning your academic terms.'
                : 'Access your academic planning dashboard.'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" aria-live="polite">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} disabled={submitting} required />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={portal === 'supervisor' ? 'supervisor@university.edu' : 'student@university.edu'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => {
                      setResetEmail(email);
                      setResetOpen(true);
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={submitting}
                required
                minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="year">Current academic year</Label>
                <Select value={year} onValueChange={setYear} disabled={submitting}>
                  <SelectTrigger id="year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(y => (
                      <SelectItem key={y} value={String(y)}>
                        Year {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Courses from earlier years are marked as completed. You can adjust them later.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button type="submit" size="lg" className="w-full" disabled={submitting || !email || !password}>
              {submitting && <Loader2 className="animate-spin" />}
              {isSignUp ? 'Create account' : 'Log in'}
            </Button>
            {canSignUp ? (
              <p className="text-center text-sm text-muted-foreground">
                {isSignUp ? 'Already have an account? ' : 'New to Term Supervisor? '}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                >
                  {isSignUp ? 'Log in' : 'Sign up'}
                </button>
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Supervisor accounts are created by your institution&apos;s administrator.
              </p>
            )}
          </CardFooter>
        </form>
      </Card>

      {mode === 'demo' && (
        <Alert variant="warning">
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Firebase is not configured, so accounts and data are stored in this browser only. Use a demo account
              (password <code className="font-mono">{DEMO_PASSWORD}</code>):
            </p>
            <div className="flex flex-wrap gap-2">
              {demoAccounts.map(account => (
                <Button key={account.uid} type="button" variant="outline" size="sm" onClick={() => fillDemo(account.email)}>
                  {account.name}
                  {account.year ? ` · Y${account.year}` : ''}
                </Button>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-primary" /> Reset your password
            </DialogTitle>
            <DialogDescription>Enter your email and we&apos;ll send you a reset link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              disabled={resetting}
            />
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={resetting}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleReset} disabled={resetting || !resetEmail.trim()}>
              {resetting && <Loader2 className="animate-spin" />}
              Send reset link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
