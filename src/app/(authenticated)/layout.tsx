
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Dices, AlertTriangle, ShieldCheck, LogOut, Home, User, FileUp } from 'lucide-react';
import Link from 'next/link';
import { signOut as signOutAction } from '@/actions/auth'; // Renamed signOut to signOutAction
import { useToast } from '@/hooks/use-toast';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, loading: authContextLoading, isFirebaseInitialized } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    // console.log('[AuthenticatedLayout] useEffect (main) triggered. AuthContext state:', { user: user?.uid, authContextLoading, isFirebaseInitialized, isVerifying}); // Debug
    if (!authContextLoading && isFirebaseInitialized) {
      if (user) {
        // console.log('[AuthenticatedLayout] User is present. Setting isVerifying to false.'); // Debug
        if (isVerifying) setIsVerifying(false);
      } else {
        if (!isVerifying) {
            // console.log('[AuthenticatedLayout] No user and not verifying. Redirecting to /auth/login.'); // Debug
            router.push('/auth/login');
        } else {
            // console.log('[AuthenticatedLayout] No user, but still verifying. Waiting for verification timeout or change.'); // Debug
        }
      }
    } else if (!authContextLoading && !isFirebaseInitialized) {
        // console.error('[AuthenticatedLayout] Firebase not initialized. isVerifying to false.');
        if (isVerifying) setIsVerifying(false);
    } else if (authContextLoading) {
        // console.log('[AuthenticatedLayout] Auth context still loading...'); // Debug
    }
  }, [user, authContextLoading, router, isFirebaseInitialized, isVerifying]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    // console.log('[AuthenticatedLayout] useEffect (verification timer) triggered. Current state:', { authContextLoading, isFirebaseInitialized, userPresent: !!user, isVerifying }); // Debug
    if (!authContextLoading && isFirebaseInitialized && !user && isVerifying) {
      // console.log('[AuthenticatedLayout] Starting verification timeout (1s) because no user and auth is ready.'); // Debug
      timer = setTimeout(() => {
        // console.log('[AuthenticatedLayout] Verification timeout ELAPSED. Setting isVerifying to false.'); // Debug
        setIsVerifying(false); 
      }, 1000); 
    } else if (isVerifying && (user || !isFirebaseInitialized || authContextLoading)) {
      // console.log('[AuthenticatedLayout] Condition met to set isVerifying false early (user present, or firebase not init, or auth loading).'); // Debug
      setIsVerifying(false);
    }
    
    return () => {
      if (timer) {
        // console.log('[AuthenticatedLayout] Clearing verification timeout.'); // Debug
        clearTimeout(timer);
      }
    };
  }, [authContextLoading, isFirebaseInitialized, user, isVerifying]);

  useEffect(() => {
    if (user) {
      setClaimsLoading(true);
      // console.log(`[AuthenticatedLayout] User ${user.uid} detected. Fetching ID token result for custom claims...`); // Debug
      user.getIdTokenResult()
        .then((idTokenResult) => {
          // console.log(`[AuthenticatedLayout] ID token result for ${user.uid}:`, idTokenResult.claims); // Debug
          if (idTokenResult.claims.admin === true) {
            // console.log(`[AuthenticatedLayout] User ${user.uid} has 'admin: true' claim.`); // Debug
            setIsAdmin(true);
          } else {
            // console.log(`[AuthenticatedLayout] User ${user.uid} does NOT have 'admin: true' claim.`); // Debug
            setIsAdmin(false);
          }
          setClaimsLoading(false);
        })
        .catch((error) => {
          console.error("[AuthenticatedLayout] Error getting ID token result for custom claims:", error);
          setIsAdmin(false);
          setClaimsLoading(false);
        });
    } else {
      // console.log('[AuthenticatedLayout] No user present, setting isAdmin to false and claimsLoading to false.'); // Debug
      setIsAdmin(false);
      setClaimsLoading(false); 
    }
  }, [user]);

  const handleSignOut = async () => {
    // console.log('[AuthenticatedLayout] handleSignOut called.'); // Debug
    const result = await signOutAction(); // Use renamed action
    if (result.success && result.redirectPath) {
      // console.log('[AuthenticatedLayout] SignOut action successful, redirecting to:', result.redirectPath); // Debug
      router.push(result.redirectPath);
    } else if (!result.success && result.message) {
      // console.error("[AuthenticatedLayout] SignOut action failed:", result.message); // Debug
      toast({ title: "Sign Out Failed", description: result.message, variant: "destructive" });
    } else {
      // console.log('[AuthenticatedLayout] SignOut action result not conclusive, redirecting to /auth/login as fallback.'); // Debug
      router.push('/auth/login');
    }
  };

  const navButtonBaseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
  const navButtonStyle = `${navButtonBaseClasses} border border-input bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground`;
  const destructiveButtonStyle = `${navButtonBaseClasses} bg-destructive text-destructive-foreground hover:bg-destructive/90`;

  if (authContextLoading) {
    // console.log('[AuthenticatedLayout] Rendering: AuthContext Loading screen.'); // Debug
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

  if (isVerifying && !user) { 
    // console.log('[AuthenticatedLayout] Rendering: Verifying Session screen.'); // Debug
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <ShieldCheck className="h-16 w-16 animate-pulse text-accent" />
        <p className="mt-4 text-lg font-headline">Verifying Session...</p>
      </div>
    );
  }
  
  if (!user) {
    // console.log('[AuthenticatedLayout] Rendering: No User, (should be) redirecting to Login screen.'); // Debug
    return ( 
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Dices className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg font-headline">Redirecting to Login...</p>
      </div>
    );
  }

  // console.log(`[AuthenticatedLayout] Rendering children for authenticated user: ${user.uid}. Admin status: ${isAdmin}, Claims loading: ${claimsLoading}`); // Debug

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
            <Link href="/dashboard" className={navButtonStyle}>
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </Link>
            <Link href="/account" className={navButtonStyle}>
              <User className="mr-2 h-4 w-4" /> Account
            </Link>
            {isAdmin && !claimsLoading && (
              <Link href="/admin/import-quests" className={navButtonStyle}>
                <FileUp className="mr-2 h-4 w-4" /> Admin Import
              </Link>
            )}
          </nav>
          <div className="flex items-center space-x-2 md:space-x-4">
            <button onClick={handleSignOut} className={destructiveButtonStyle}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </button>
          </div>
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

