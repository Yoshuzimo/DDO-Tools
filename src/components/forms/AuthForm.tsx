
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { auth as clientAuth } from '@/lib/firebase'; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  type AuthError
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validateFields = () => {
    console.log(`[AuthForm Client] Validating fields for ${mode}. Email: ${email}`); // Debug
    const errors: { email?: string; password?: string } = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email address.";
    }
    if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
    setFieldErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    console.log(`[AuthForm Client] Validation ${isValid ? 'passed' : 'failed'}. Errors:`, errors); // Debug
    return isValid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log(`[AuthForm Client] handleSubmit called for ${mode}.`); // Debug
    setError(null);
    setFieldErrors({});

    if (!validateFields()) {
      return;
    }

    setIsLoading(true);
    console.log(`[AuthForm Client] Attempting ${mode} with clientAuth. Email: ${email}`); // Debug

    try {
      if (!clientAuth) {
        console.error("[AuthForm Client] CRITICAL: Firebase client auth (clientAuth) is not available.");
        throw new Error("Firebase client auth is not available.");
      }

      if (mode === 'signup') {
        await createUserWithEmailAndPassword(clientAuth, email, password);
        console.log(`[AuthForm Client] Client-side createUserWithEmailAndPassword successful for ${email}.`); // Debug
        toast({ title: "Sign Up Successful", description: "Welcome! Redirecting to dashboard..." });
        router.push('/dashboard');
      } else {
        await signInWithEmailAndPassword(clientAuth, email, password);
        console.log(`[AuthForm Client] Client-side signInWithEmailAndPassword successful for ${email}.`); // Debug
        toast({ title: "Login Successful", description: "Welcome back! Redirecting to dashboard..." });
        router.push('/dashboard');
      }
    } catch (authError: any) {
      const firebaseError = authError as AuthError;
      console.error(`[AuthForm Client] Client-side ${mode} error:`, firebaseError.code, firebaseError.message, firebaseError); // Debug
      let errorMessage = `Failed to ${mode}. Please try again.`;
      if (firebaseError.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use.';
        setFieldErrors(prev => ({ ...prev, email: errorMessage }));
      } else if (firebaseError.code === 'auth/invalid-credential' || 
                 firebaseError.code === 'auth/user-not-found' || 
                 firebaseError.code === 'auth/wrong-password' ||
                 firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email or password.';
      } else if (firebaseError.code) {
        errorMessage = `Error: ${firebaseError.code.replace('auth/', '').replace(/-/g, ' ')}.`;
      }
      setError(errorMessage);
      toast({ title: `${mode === 'login' ? 'Login' : 'Sign Up'} Failed`, description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      console.log(`[AuthForm Client] ${mode} process finished. isLoading: false.`); // Debug
    }
  };

  // Removed the console.log statement that was here logging on every render.
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-2xl">
      <div className="flex flex-col space-y-1.5 p-6 text-center">
        <h2 className="text-3xl font-semibold leading-none tracking-tight font-headline">
          {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === 'login' ? 'Enter your credentials to access your vault.' : 'Join the DDO Character Vault.'}
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="p-6 pt-0 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="adventurer@example.com" 
              required 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-background/70 focus:bg-background/90"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby="email-error"
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && <p id="email-error" className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-background/70 focus:bg-background/90"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-error"
              aria-invalid={!!fieldErrors.password}
            />
            {fieldErrors.password && <p id="password-error" className="text-xs text-destructive">{fieldErrors.password}</p>}
          </div>

           {error && !fieldErrors.email && !fieldErrors.password && (
             <div 
               className="flex items-center p-3 text-sm rounded-md border border-destructive text-destructive bg-destructive/10" 
               role="alert"
             >
               <AlertTriangle className="h-5 w-5 mr-2" />
               <p>{error}</p>
             </div>
           )}
        </div>
        <div className="flex items-center p-6 pt-0 flex-col space-y-4">
          <button type="submit" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-4 py-2 w-full" disabled={isLoading}>
            {isLoading ? (mode === 'login' ? 'Logging in...' : 'Signing up...') : (mode === 'login' ? 'Login' : 'Sign Up')}
            {!isLoading && <LogIn className="ml-2 h-4 w-4" />}
          </button>
           {mode === 'login' ? (
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-accent p-0 h-auto underline-offset-4 hover:underline">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-accent p-0 h-auto underline-offset-4 hover:underline">
                Login
              </Link>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

