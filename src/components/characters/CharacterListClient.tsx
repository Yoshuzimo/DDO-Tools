'use client';

import type { Character, CharacterSortOption } from '@/types';
import { CharacterCard } from './CharacterCard';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowDownUp, ListFilter, Dices } from 'lucide-react';
import { useAuthContext } from '@/hooks/useAuthContext';
import { db } from '@/lib/firebase'; // Import client-side db
import { collection, query, getDocs, orderBy as firestoreOrderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface CharacterListClientProps {
  initialCharacters: Character[];
}

export function CharacterListClient({ initialCharacters }: CharacterListClientProps) {
  const { user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [characters, setCharacters] = useState<Character[]>(initialCharacters);
  const [currentSortField, setCurrentSortField] = useState<CharacterSortOption['field']>('createdAt');
  const [currentSortDirection, setCurrentSortDirection] = useState<CharacterSortOption['direction']>('desc');
  const [isLoading, setIsLoading] = useState(true);

  const hasFetchedRef = useRef(false);

  const fetchCharactersClientSide = useCallback(
    async (uid: string, sortField: CharacterSortOption['field'], sortDirection: CharacterSortOption['direction']) => {
      console.log(`[CharacterListClient] Fetching characters for UID: ${uid}, Sort: ${sortField} ${sortDirection}`);
      setIsLoading(true);
      try {
        const charactersCollectionRef = collection(db, 'users', uid, 'characters');
        const q = query(charactersCollectionRef, firestoreOrderBy(sortField, sortDirection));
        const querySnapshot = await getDocs(q);

        const fetchedCharacters = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
          const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();

          return {
            id: docSnap.id,
            userId: data.userId,
            name: data.name,
            level: data.level,
            imageUrl: data.imageUrl || null,
            favorDetails: data.favorDetails || {},
            questCompletionStatus: data.questCompletionStatus || {},
            uiPreferences: data.uiPreferences || {},
            class: data.class || undefined,
            tokens: data.tokens || {},
            equipment: data.equipment || {},
            createdAt,
            updatedAt,
          } as Character;
        });

        console.log('[CharacterListClient] Characters fetched:', fetchedCharacters.length);
        setCharacters(fetchedCharacters);
      } catch (error: any) {
        console.error('[CharacterListClient] Fetch error:', error.message);
        toast({
          title: 'Fetch Error',
          description: `Failed to load characters: ${error.message}`,
          variant: 'destructive',
        });
        setCharacters([]);
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (!authLoading && user?.uid && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCharactersClientSide(user.uid, currentSortField, currentSortDirection);
    } else if (!authLoading && !user) {
      console.log('[CharacterListClient] No user. Clearing characters.');
      setCharacters([]);
      setIsLoading(false);
    }
  }, [authLoading, user?.uid, currentSortField, currentSortDirection, fetchCharactersClientSide]);

  const handleCharacterDelete = (deletedCharacterId: string) => {
    setCharacters((prev) => prev.filter((char) => char.id !== deletedCharacterId));
  };

  const handleSortFieldChange = (field: CharacterSortOption['field']) => {
    setCurrentSortField(field);
    hasFetchedRef.current = false;
  };

  const toggleSortDirection = () => {
    const newDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    setCurrentSortDirection(newDirection);
    hasFetchedRef.current = false;
  };

  if (authLoading || (isLoading && characters.length === 0 && user)) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Dices className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>{authLoading ? 'Authenticating...' : 'Loading characters...'}</p>
      </div>
    );
  }

  if (!user && !authLoading) {
    return <p className="text-muted-foreground text-center py-10">Please log in to see your characters.</p>;
  }

  if (characters.length === 0 && !isLoading) {
    return <p className="text-muted-foreground text-center py-10">No characters found. Start by creating one!</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold font-headline">Your Heroes</h2>
        <div className="flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-muted-foreground" />
          <select
            value={currentSortField}
            onChange={(e) => handleSortFieldChange(e.target.value as CharacterSortOption['field'])}
            className="w-[180px] h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background/70 focus:bg-background/90"
            disabled={isLoading}
          >
            <option value="name">Name</option>
            <option value="level">Level</option>
            <option value="createdAt">Date Created</option>
          </select>
          <button
            onClick={toggleSortDirection}
            title={`Sort ${currentSortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10"
            disabled={isLoading}
          >
            <ArrowDownUp className={`h-4 w-4 ${currentSortDirection === 'desc' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} onDelete={handleCharacterDelete} />
        ))}
      </div>
    </div>
  );
}
