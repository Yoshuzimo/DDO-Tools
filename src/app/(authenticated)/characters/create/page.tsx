import { CharacterCreateForm } from "@/components/forms/CharacterCreateForm";

export default function CreateCharacterPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-accent">
          Create New Character
        </h1>
        <p className="text-muted-foreground">
          Begin your new adventure by defining your character. More details can
          be added later.
        </p>
      </div>
      <CharacterCreateForm />
    </div>
  );
}
