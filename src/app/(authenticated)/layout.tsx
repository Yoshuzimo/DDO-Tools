
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Dices, AlertTriangle, ShieldCheck, LogOut, Home, User, FileUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { signOut as signOutAction } from '@/actions/auth';
import { useToast } from '@/hooks/use-toast';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, loading: authContextLoading, isFirebaseInitialized } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    // console.log('[AuthenticatedLayout] Main useEffect. Auth State:', { user: user?.uid, authContextLoading, isFirebaseInitialized });
    if (!authContextLoading && isFirebaseInitialized && !user) {
      // console.log('[AuthenticatedLayout] No user, Firebase initialized, auth not loading. Redirecting to /auth/login.');
      router.push('/auth/login');
    }
  }, [user, authContextLoading, isFirebaseInitialized, router]);

  useEffect(() => {
    if (user) {
      setClaimsLoading(true);
      // console.log(`[AuthenticatedLayout] User ${user.uid} detected. Fetching ID token result...`);
      user.getIdTokenResult()
        .then((idTokenResult) => {
          // console.log(`[AuthenticatedLayout] ID token result for ${user.uid}:`, idTokenResult.claims);
          if (idTokenResult.claims.admin === true) {
            // console.log(`[AuthenticatedLayout] User ${user.uid} is admin.`);
            setIsAdmin(true);
          } else {
            // console.log(`[AuthenticatedLayout] User ${user.uid} is NOT admin.`);
            setIsAdmin(false);
          }
        })
        .catch((error) => {
          console.error("[AuthenticatedLayout] Error getting ID token result for custom claims:", error);
          setIsAdmin(false);
        })
        .finally(() => {
          setClaimsLoading(false);
          // console.log(`[AuthenticatedLayout] Claims loading finished. isAdmin: ${isAdmin}`);
        });
    } else {
      // console.log('[AuthenticatedLayout] No user, setting isAdmin to false, claimsLoading to false.');
      setIsAdmin(false);
      setClaimsLoading(false);
    }
  }, [user]); // Dependency: only user

  const handleSignOut = async () => {
    // console.log('[AuthenticatedLayout] handleSignOut called.');
    const result = await signOutAction();
    if (result.success && result.redirectPath) {
      // console.log('[AuthenticatedLayout] SignOut action successful, redirecting to:', result.redirectPath);
      router.push(result.redirectPath);
    } else if (!result.success && result.message) {
      // console.error("[AuthenticatedLayout] SignOut action failed:", result.message);
      toast({ title: "Sign Out Failed", description: result.message, variant: "destructive" });
    } else {
      // console.log('[AuthenticatedLayout] SignOut action result not conclusive, redirecting to /auth/login.');
      router.push('/auth/login');
    }
  };

  const navButtonBaseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
  const navButtonStyle = `${navButtonBaseClasses} border border-input bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground`;
  const destructiveButtonStyle = `${navButtonBaseClasses} bg-destructive text-destructive-foreground hover:bg-destructive/90`;

  if (authContextLoading) {
    // console.log('[AuthenticatedLayout] Rendering: AuthContext Loading screen.');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Dices className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg font-headline">Initializing Authentication...</p>
      </div>
    );
  }

  if (!isFirebaseInitialized) {
    // console.error('[AuthenticatedLayout] Rendering: Firebase Not Initialized screen.');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <p className="mt-4 text-xl font-bold font-headline text-destructive">Firebase Client Connection Issue</p>
        <p className="mt-2 text-center text-muted-foreground">
          There was an issue connecting to Firebase services. Please check console for details.
        </p>
      </div>
    );
  }
  
  if (!user && !authContextLoading && isFirebaseInitialized) {
    // This state means auth is resolved, Firebase is initialized, but there's no user.
    // The useEffect above should be handling the redirect.
    // Show a generic loading/redirecting message.
    // console.log('[AuthenticatedLayout] Rendering: No User, redirecting to Login screen.');
    return ( 
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Dices className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg font-headline">Redirecting to Login...</p>
      </div>
    );
  }
  
  // If user object exists but we are still claimsLoading for some reason, show a specific loader for nav area
  // Or simply let the nav render without the admin link until claimsLoading is false.
  // For simplicity, the admin link will just not appear while claimsLoading is true.

  // console.log(`[AuthenticatedLayout] Rendering children for authenticated user: ${user?.uid}. Admin: ${isAdmin}, ClaimsLoading: ${claimsLoading}`);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Dices className="h-6 w-6 text-accent" />
            <span className="font-bold font-headline sm:inline-block">
              DDO Character Vault
            </span>
          </Link>
          <nav className="flex flex-1 items-center space-x-2 md:space-x-4">
            {user && ( // Ensure user exists before rendering these links
              <>
                <Link href="/dashboard" className={navButtonStyle}>
                  <Home className="mr-2 h-4 w-4" /> Dashboard
                </Link>
                <Link href="/account" className={navButtonStyle}>
                  <User className="mr-2 h-4 w-4" /> Account
                </Link>
                {claimsLoading && (
                  <div className="flex items-center justify-center px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!claimsLoading && isAdmin && (
                  <Link href="/admin/import-quests" className={navButtonStyle}>
                    <FileUp className="mr-2 h-4 w-4" /> Admin Import
                  </Link>
                )}
              </>
            )}
          </nav>
          {user && ( // Ensure user exists for sign out button
            <div className="flex items-center space-x-2 md:space-x-4">
              <button onClick={handleSignOut} className={destructiveButtonStyle}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="py-6 text-center text-muted-foreground text-sm border-t border-border/40">
        DDO Character Vault &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
