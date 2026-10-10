'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LayoutDashboard, Loader2, LogOut, Moon, NotebookText, RotateCcw, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { resetDemoData } from '@/lib/store';
import { initials } from '@/lib/utils';

export default function AppHeader() {
  const { user, mode, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast({ title: 'Signed out', description: 'You have been signed out.' });
      router.push('/');
    } catch {
      toast({ title: 'Sign out failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleResetDemo = () => {
    resetDemoData();
    toast({ title: 'Demo data reset', description: 'Students, submissions and meetings were restored.' });
  };

  const dashboardHref = user?.role === 'supervisor' ? '/supervisor/dashboard' : '/student/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href={user ? dashboardHref : '/'} className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80">
          <NotebookText className="size-6 shrink-0 text-primary" aria-hidden />
          <span className="truncate text-base font-semibold sm:text-lg">Term Supervisor</span>
        </Link>

        <div className="flex items-center gap-2">
          {mode === 'demo' && (
            <Badge variant="warning" className="hidden sm:inline-flex" title="Data is stored in this browser only">
              Demo mode
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle colour theme"
          >
            <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-9 rounded-full p-0" aria-label="Account menu">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="mt-1.5 capitalize">
                    {user.role}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push(dashboardHref)}>
                  <LayoutDashboard className="mr-2 size-4" /> Dashboard
                </DropdownMenuItem>
                {mode === 'demo' && (
                  <DropdownMenuItem onSelect={handleResetDemo}>
                    <RotateCcw className="mr-2 size-4" /> Reset demo data
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleSignOut}
                  disabled={isSigningOut}
                  className="text-destructive focus:text-destructive"
                >
                  {isSigningOut ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LogOut className="mr-2 size-4" />}
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
