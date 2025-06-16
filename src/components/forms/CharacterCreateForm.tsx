
'use client';

import { useState, useRef, FormEvent, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { PlusCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/hooks/useAuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';
import { DEFAULT_UI_PREFERENCES } from '@/types';

// ShadCN UI Component Imports
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';


const CharacterClientSchema = z.object({
  name: z.string().min(2, { message: "Character name must be at least 2 characters." }).max(50, { message: "Character name too long."}),
  level: z.coerce.number().min(1, { message: "Level must be at least 1." }).max(40, { message: "Level cannot exceed 40."}),
});


export function CharacterCreateForm() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState('');
  const [level, setLevel] = useState<string | number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string[]; level?: string[]; general?: string[] }>({});

  const handleClientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("[CharacterCreateForm] handleClientSubmit called."); 

    if (!user) {
      console.error("[CharacterCreateForm] User not authenticated. Cannot create character.");
      toast({ title: "Authentication Error", description: "You must be logged in to create a character.", variant: "destructive" });
      return;
    }

    const validatedFields = CharacterClientSchema.safeParse({ name, level });

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten().fieldErrors;
      console.error("[CharacterCreateForm] Client-side validation failed:", errors);
      setFormErrors(errors);
      let errorMessages = "Validation failed: ";
      if(errors.name) errorMessages += `Name (${errors.name.join(', ')}) `;
      if(errors.level) errorMessages += `Level (${errors.level.join(', ')}) `;
      toast({ title: "Validation Error", description: errorMessages.trim(), variant: "destructive"});
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);
    console.log(`[CharacterCreateForm] Attempting to create character "${validatedFields.data.name}" (Level: ${validatedFields.data.level}) for user ${user.uid} client-side.`);

    const characterDataToSave = {
      userId: user.uid,
      name: validatedFields.data.name,
      level: validatedFields.data.level,
      imageUrl: null,
      favorDetails: {},
      questCompletionStatus: {},
      uiPreferences: { ...DEFAULT_UI_PREFERENCES }, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("[CharacterCreateForm] Data to save:", JSON.stringify(characterDataToSave, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return 'FirebaseServerTimestamp';
      }
      return value;
    }, 2));


    try {
      if (!db) {
        console.error("[CharacterCreateForm] CRITICAL: Firestore client (db) not available.");
        toast({ title: "Internal Error", description: "Firestore service not available. Please try again later.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const charactersCollectionRef = collection(db, 'users', user.uid, 'characters');
      const newCharDocRef = await addDoc(charactersCollectionRef, characterDataToSave);

      console.log(`[CharacterCreateForm] Character created successfully client-side with ID: ${newCharDocRef.id}`);
      toast({ title: "Success!", description: `Character "${validatedFields.data.name}" created successfully!`, variant: 'default' });
      
      if(formRef.current) formRef.current.reset();
      setName('');
      setLevel(1);
      
      setTimeout(() => {
        router.push('/dashboard'); // Changed redirect to /dashboard
      }, 1000); // Delay to allow toast to show and data to settle

    } catch (error: any) {
      console.error("[CharacterCreateForm] Client-side error creating character. Full error object:", error);
      console.error("[CharacterCreateForm] Error Code:", error.code);
      console.error("[CharacterCreateForm] Error Message:", error.message);
      console.error("[CharacterCreateForm] Error Stack:", error.stack);

      let errorMessage = "Failed to create character. Please try again.";
      if (error.code && typeof error.code === 'string' && error.code.includes('permission-denied')) { 
        errorMessage = `Permission Denied: ${error.message || 'Check Firestore rules and authentication.'}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      setFormErrors({ general: [errorMessage] });
      toast({ title: "Creation Failed", description: errorMessage, variant: 'destructive'});
    } finally {
      setIsSubmitting(false);
    }
  };


  if (authLoading) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-lg mx-auto p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-muted-foreground">Loading user information...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold leading-none tracking-tight font-headline">Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to create a character.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="rounded-lg border bg-card text-card-foreground shadow-xl w-full max-w-lg mx-auto">
      <CardHeader className="flex flex-col space-y-1.5 p-6">
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight font-headline">Forge a New Hero</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Enter the basic details for your new character.</CardDescription>
      </CardHeader>
      <form onSubmit={handleClientSubmit} ref={formRef}>
        <input type="hidden" name="userId" value={user.uid} />
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Character Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="e.g., Elara Quickfoot" 
              required 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-background/70 focus:bg-background/90"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-describedby="name-error"
              disabled={isSubmitting || authLoading}
            />
            {formErrors?.name && <p id="name-error" className="text-xs text-destructive">{formErrors.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="level" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Starting Level</Label>
            <Input 
              id="level" 
              name="level" 
              type="number" 
              placeholder="1" 
              min="1" 
              max="40" 
              required 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-background/70 focus:bg-background/90"
              value={level}
              onChange={(e) => setLevel(e.target.value === '' ? '' : Number(e.target.value))}
              aria-describedby="level-error"
              disabled={isSubmitting || authLoading}
            />
            {formErrors?.level && <p id="level-error" className="text-xs text-destructive">{formErrors.level[0]}</p>}
          </div>
          {formErrors?.general && (
             <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/30">
               <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
               <p>{formErrors.general[0]}</p>
             </div>
           )}
        </CardContent>
        <CardFooter className="flex items-center p-6 pt-0">
          <Button type="submit" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-4 py-2 w-full" disabled={isSubmitting || authLoading || !user}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Character...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Character
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

