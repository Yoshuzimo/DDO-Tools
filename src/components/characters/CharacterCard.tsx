
import type { Character } from '@/types';
import Link from 'next/link';
import NextImage from 'next/image';
import { Edit3, Trash2 } from 'lucide-react';
import { deleteCharacterAction } from '@/actions/characters';
import { useToast } from '@/hooks/use-toast';

interface CharacterCardProps {
  character: Character;
  onDelete?: (characterId: string) => void;
}

export function CharacterCard({ character, onDelete }: CharacterCardProps) {
  const { toast } = useToast();

  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent Link navigation when delete is clicked
    event.preventDefault(); // Prevent Link navigation
    if (!character.userId || !character.id) {
      toast({ title: "Error", description: "Character data is incomplete for deletion.", variant: "destructive" });
      return;
    }
    if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to delete "${character.name}"? This action cannot be undone.`)) {
      const result = await deleteCharacterAction(character.userId, character.id);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        onDelete?.(character.id);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <Link href={`/characters/${character.id}`} className="flex flex-col flex-grow focus:outline-none focus:ring-2 focus:ring-accent rounded-lg" aria-label={`View details for ${character.name}`}>
        <div className="flex flex-row items-start gap-4 space-y-0 p-6">
          {character.imageUrl ? (
            <NextImage 
              src={character.imageUrl} 
              alt={character.name} 
              width={64}
              height={64}
              className="rounded-md border object-cover"
              data-ai-hint="fantasy avatar"
            />
          ) : (
            <div 
              className="h-16 w-16 rounded-md border bg-muted text-muted-foreground flex items-center justify-center text-xl font-semibold"
              data-ai-hint="fantasy avatar"
            >
              {getInitials(character.name)}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-semibold leading-none tracking-tight font-headline text-accent">{character.name}</h3>
            <p className="text-sm text-muted-foreground">Level {character.level} {character.class || 'Adventurer'}</p>
          </div>
        </div>
        <div className="p-6 pt-0 flex-grow">
          <p className="text-sm text-muted-foreground">
            Updated: {new Date(character.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </Link>
      <div className="flex items-center p-6 pt-0 gap-2 border-t border-border/40 mt-auto">
        <Link 
          href={`/characters/${character.id}/edit-name`} 
          title="Edit Character Name" 
          onClick={(e) => e.stopPropagation()} // Prevent Link navigation from parent
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 text-muted-foreground"
        >
            <Edit3 className="h-4 w-4" />
        </Link>
        <button 
            onClick={handleDelete} 
            title="Delete Character"
            className="ml-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive/10 hover:text-destructive h-10 w-10 text-destructive/70"
        >
            <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
