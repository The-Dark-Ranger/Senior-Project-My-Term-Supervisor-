
"use client";

import { useEffect, useState } from 'react';
import { NotebookText, LogOut, UserCircle, Settings, Sun, Moon, Loader2 } from 'lucide-react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { signOut } from 'firebase/auth';   // Import signOut function
import { useToast } from "@/hooks/use-toast";
import type { LoggedInUser } from '@/types';


export default function AppHeader() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []); 

  useEffect(() => {
    if (!mounted) return; 

    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        const parsedUser: LoggedInUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem('loggedInUser'); 
        setUser(null);
      }
    } else {
      setUser(null);
    }

    // Listen for storage changes to sync across tabs (optional but good practice)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'loggedInUser') {
        const currentStoredUser = localStorage.getItem('loggedInUser');
        if (currentStoredUser) {
          try {
            setUser(JSON.parse(currentStoredUser));
          } catch (e) {
            localStorage.removeItem('loggedInUser');
            setUser(null); 
          }
        } else {
          setUser(null);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };

  }, [mounted]);


  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth); // Firebase sign out
      localStorage.removeItem('loggedInUser');
      setUser(null);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/');
    } catch (error) {
      console.error("Sign out error:", error);
      toast({ title: "Sign Out Failed", description: "Could not sign you out. Please try again.", variant: "destructive" });
    } finally {
      setIsSigningOut(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?'; // Fallback for no name
    const names = name.split(' ');
    if (names.length === 1) return names[0][0]?.toUpperCase() || '?';
    return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
  }

  // Skeleton for when the component is not yet mounted
  if (!mounted) {
    return (
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50" suppressHydrationWarning={true}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between" suppressHydrationWarning={true}>
          <div className="flex items-center gap-2 sm:gap-2.5" suppressHydrationWarning={true}>
            <div className="h-6 w-6 sm:h-7 sm:w-7 bg-primary/20 rounded-full" suppressHydrationWarning={true}></div> {/* Placeholder for icon */}
            <div className="h-5 w-32 sm:w-40 bg-muted rounded" suppressHydrationWarning={true}></div> {/* Placeholder for title */}
          </div>
          <div className="flex items-center gap-2 sm:gap-3" suppressHydrationWarning={true}>
             <div className="h-8 w-8 sm:h-9 sm:w-9 bg-muted rounded-full" suppressHydrationWarning={true}></div> {/* Placeholder for theme toggle */}
          </div>
        </div>
      </header>
    );
  }


  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50" suppressHydrationWarning={true}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 hover:opacity-80 transition-opacity">
          <NotebookText size={24} className="text-primary" />
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Term Supervisor</h1>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 sm:h-9 sm:w-9"
            aria-label="Toggle theme"
          >
            <Sun className="h-[1rem] w-[1rem] sm:h-[1.2rem] sm:w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1rem] w-[1rem] sm:h-[1.2rem] sm:w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(user.type === 'student' ? '/student/dashboard' : '/supervisor/dashboard')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled> 
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings (Soon)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  disabled={isSigningOut}
                  className="text-red-600 dark:text-red-500 focus:bg-red-50 dark:focus:bg-red-700/20 focus:text-red-700 dark:focus:text-red-400"
                >
                  {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut size={16} className="mr-2" />}
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
