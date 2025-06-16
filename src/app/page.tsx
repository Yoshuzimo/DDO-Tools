"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Dices } from "lucide-react";

export default function HomePage() {
  const { user, loading, isFirebaseInitialized } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isFirebaseInitialized) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [user, loading, router, isFirebaseInitialized]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <Dices className="h-24 w-24 animate-bounce text-primary" />
      <h1 className="mt-8 text-4xl font-bold font-headline text-accent">
        DDO Character Vault
      </h1>
      <p className="mt-4 text-xl text-foreground/80">
        Loading your adventure...
      </p>
    </div>
  );
}
