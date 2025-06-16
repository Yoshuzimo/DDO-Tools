
import { EditCharacterNameForm } from '@/components/forms/EditCharacterNameForm';
import { notFound } from 'next/navigation';

// Define the expected shape of the resolved params
interface PageParamsType {
  characterId: string;
}

// The props signature for the page component.
// `params` itself can be the resolved object or a Promise that resolves to it.
export default async function EditCharacterNamePage({ params: paramsFromProps }: { params: PageParamsType | Promise<PageParamsType> }) {
  // Await paramsFromProps. If it's an object, it's returned directly. If a promise, it's resolved.
  const resolvedParams = await paramsFromProps;

  const characterId = resolvedParams?.characterId;

  if (!characterId || typeof characterId !== 'string' || characterId.trim() === '') {
    console.error("[EditCharacterNamePage Server] Critical: characterId is invalid or empty after resolving params. Resolved params was:", resolvedParams);
    notFound(); // Character ID is essential for this page
    return null; 
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-accent">Edit Character Name</h1>
        <p className="text-muted-foreground">
          Update your hero's moniker.
        </p>
      </div>
      <EditCharacterNameForm characterId={characterId} />
    </div>
  );
}
