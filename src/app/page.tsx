
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Dices } from 'lucide-react';

export default function HomePage() {
  const { user, loading, isFirebaseInitialized } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    console.log(`[HomePage] useEffect triggered. Starting 3-second delay for redirection. Initial state - isFirebaseInitialized: ${isFirebaseInitialized}, loading: ${loading}, user: ${user ? user.uid : null}`);

    const timeoutId = setTimeout(() => {
      console.log('[HomePage] 3-second delay complete. Now checking auth state for redirection.');
      console.log(`[HomePage] State at timeout completion - isFirebaseInitialized: ${isFirebaseInitialized}, loading: ${loading}, user: ${user ? user.uid : null}`);

      if (isFirebaseInitialized && !loading) {
        if (user) {
          console.log('[HomePage] User found after delay and Firebase ready, redirecting to /dashboard');
          router.replace('/dashboard');
        } else {
          console.log('[HomePage] No user found after delay and Firebase ready, redirecting to /auth/login');
          router.replace('/auth/login');
        }
      } else {
        console.warn(`[HomePage] Firebase not initialized or auth still loading after 3-second delay. Redirection aborted. Current state: isFirebaseInitialized=${isFirebaseInitialized}, loading=${loading}`);
        // If Firebase is still not ready, the user remains on the loading page.
        // An additional message could be displayed here if desired.
      }
    }, 3000); // 3-second delay

    return () => {
      console.log('[HomePage] Clearing redirect timeout (e.g., component unmount or dependency change).');
      clearTimeout(timeoutId);
    };
    // Dependencies: router, user, loading, isFirebaseInitialized.
    // If these change, the effect re-runs, clearing the old timeout and starting a new one.
    // This ensures that if the auth state changes *during* the delay, the redirection logic
    // will eventually operate on the latest stable state after a fresh 3-second delay.
  }, [user, loading, isFirebaseInitialized, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <Dices className="h-24 w-24 animate-bounce text-primary" />
      <h1 className="mt-8 text-4xl font-bold font-headline text-accent">DDO Character Vault</h1>
      {loading || !isFirebaseInitialized ? (
        <p className="mt-4 text-xl text-foreground/80">Initializing and checking session...</p>
      ) : (
        <p className="mt-4 text-xl text-foreground/80">Preparing to redirect you (with a 3-second delay)...</p>
      )}
    </div>
  );
}
