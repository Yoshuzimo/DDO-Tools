
// src/app/(authenticated)/characters/[characterId]/page.tsx
import { CharacterDetailClient } from '@/components/characters/CharacterDetailClient';
import { notFound } from 'next/navigation';

// Define the expected shape of the resolved params
interface PageParamsType {
  characterId: string;
}

// The props signature for the page component.
// `params` itself can be the resolved object or a Promise that resolves to it.
export default async function CharacterPage({ params: paramsFromProps }: { params: PageParamsType | Promise<PageParamsType> }) {
  // Await paramsFromProps. If it's an object, it's returned directly. If a promise, it's resolved.
  const resolvedParams = await paramsFromProps;

  const characterId = resolvedParams?.characterId;

  if (!characterId || typeof characterId !== 'string' || characterId.trim() === '') {
    console.error("[CharacterPage Server] Critical: characterId is invalid or empty after resolving params. Resolved params was:", resolvedParams);
    notFound();
    return null; 
  }
  
  return <CharacterDetailClient characterIdFromPage={characterId} />;
}

