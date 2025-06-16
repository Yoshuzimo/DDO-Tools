import type { ReactNode } from "react";
import Link from "next/link";
import { Dices } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Dices className="h-6 w-6 text-accent" />
            <span className="font-bold font-headline sm:inline-block">
              DDO Character Vault
            </span>
          </Link>
          {/* Login/Signup links could go here if not part of the form pages themselves */}
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="py-6 text-center text-muted-foreground text-sm border-t border-border/40">
        DDO Character Vault &copy; {new Date().getFullYear()}
      </footer>
    </>
  );
}
