
'use client'; 

// import { Button } from '@/components/ui/button'; // Removed as Link is styled directly
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
// getCharacters Server Action is no longer needed here, CharacterListClient handles its own fetching
// import { getCharacters } from '@/actions/characters'; 
import { CharacterListClient } from '@/components/characters/CharacterListClient';


export default function DashboardPage() {
  console.log('[DashboardPage] Rendering.'); // Debug
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-accent">Character Dashboard</h1>
          <p className="text-muted-foreground">
            Oversee your roster of heroes. Click on a character to view or edit details.
          </p>
        </div>
        <Link href="/characters/create" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-4 py-2">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Character
        </Link>
      </div>
      
      {/* 
        CharacterListClient now handles its own data fetching.
        The fetchCharactersAction prop is removed.
      */}
      <CharacterListClient 
        initialCharacters={[]} 
      />
    </div>
  );
}
