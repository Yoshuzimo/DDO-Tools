"use client";

import type { User, Auth } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import type { ReactNode } from "react";
import { createContext, useEffect, useState } from "react";
import { auth as clientAuth } from "@/lib/firebase";
import { Dices, AlertTriangle } from "lucide-react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isFirebaseInitialized: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  useEffect(() => {
    console.log(
      "[AuthContext] useEffect triggered to setup Firebase listener. clientAuth object:",
      clientAuth ? "Available" : "Unavailable"
    ); // Debug

    if (clientAuth) {
      const definiteAuth: Auth = clientAuth;
      console.log(
        "[AuthContext] clientAuth object IS available. Firebase client considered initialized by AuthContext."
      ); // Debug
      setIsFirebaseInitialized(true);

      console.log("[AuthContext] Setting up onAuthStateChanged listener..."); // Debug
      const unsubscribe = onAuthStateChanged(
        definiteAuth,
        (currentUser) => {
          console.log(
            // Debug
            "[AuthContext] onAuthStateChanged FIRED. User from listener:",
            currentUser ? currentUser.uid : null,
            "Email:",
            currentUser?.email,
            "Current `user` state BEFORE setUser:",
            user ? user.uid : null
          );
          setUser(currentUser);
          console.log(
            "[AuthContext] User state processed. currentUser:",
            currentUser ? currentUser.uid : "null",
            ". setLoading(false) now."
          ); // Debug
          setLoading(false);
        },
        (error) => {
          console.error(
            "[AuthContext] onAuthStateChanged listener error:",
            error
          );
          setLoading(false);
        }
      );

      return () => {
        console.log("[AuthContext] Unsubscribing from onAuthStateChanged."); // Debug
        unsubscribe();
      };
    } else {
      console.error(
        "[AuthContext] clientAuth object from 'src/lib/firebase.ts' is NOT available when AuthProvider mounted. " +
          "Firebase client might not be initialized correctly. " +
          "Auth features will not work. isFirebaseInitialized will remain false."
      );
      setIsFirebaseInitialized(false);
      setLoading(false);
      console.log(
        "[AuthContext] clientAuth NOT available. loading set to false, isFirebaseInitialized set to false."
      ); // Debug
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    console.log(
      "[AuthContext] Rendering: Initializing DDO Character Vault screen (loading is true - waiting for first onAuthStateChanged)."
    ); // Debug
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Dices className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg font-headline">
          Initializing Authentication...
        </p>
      </div>
    );
  }

  if (!isFirebaseInitialized) {
    console.error(
      "[AuthContext] Rendering: Critical Error screen (loading is false, isFirebaseInitialized is false)."
    );
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <p className="mt-4 text-xl font-bold font-headline text-destructive">
          Critical Error: Firebase Client Not Initialized
        </p>
        <p className="mt-2 text-center text-muted-foreground">
          DDO Character Vault could not establish a connection with Firebase
          services on the client-side.
          <br />
          This typically means client-side Firebase (from{" "}
          <code>src/lib/firebase.ts</code>) failed to initialize.
          <br />
          Please check the browser console for error messages from
          'src/lib/firebase.ts' or 'src/config/firebaseClient.ts'.
          <br />
          Ensure your Firebase configuration (e.g., API key in{" "}
          <code>.env.local</code>) is correct and all Firebase services are
          enabled.
        </p>
      </div>
    );
  }

  console.log(
    "[AuthContext] Rendering children. Loading: false, Firebase Initialized: true. Current User in context:",
    user ? user.uid : "null"
  ); // Debug
  return (
    <AuthContext.Provider value={{ user, loading, isFirebaseInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};
