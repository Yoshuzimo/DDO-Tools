export interface FactionFavor {
  currentFavor: number;
}

export interface QuestCompletionStatus {
  casual: boolean;
  normal: boolean;
  hard: boolean;
  elite: boolean;
}

export const DURATION_TYPES_CONST = [
  "Very Short",
  "Short",
  "Medium",
  "Long",
  "Very Long",
] as const;
export type DurationType = (typeof DURATION_TYPES_CONST)[number];

export interface DurationWeights {
  "Very Short": number;
  Short: number;
  Medium: number;
  Long: number;
  "Very Long": number;
}

export interface CharacterUiPreferences {
  durationWeights?: DurationWeights;
  showRaids?: boolean;
  onCormyrFilter?: boolean;
  showCompletedQuestsFavorTracker?: boolean;
}

export const DEFAULT_UI_PREFERENCES: CharacterUiPreferences = {
  durationWeights: {
    "Very Short": 1.2,
    Short: 1.1,
    Medium: 1.0,
    Long: 0.9,
    "Very Long": 0.8,
  },
  showRaids: false,
  onCormyrFilter: false,
  showCompletedQuestsFavorTracker: false,
};

export interface Character {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns this character
  name: string;
  level: number;
  imageUrl?: string; // URL for the character's image
  favorDetails?: Record<string, FactionFavor>; // e.g., { "The Coin Lords": { currentFavor: 50 } }
  questCompletionStatus?: Record<string, QuestCompletionStatus>; // e.g., { "quest_id_1": { casual: true, normal: false, ... } }
  uiPreferences?: CharacterUiPreferences; // Stores UI settings for this character
  // DDO specific fields - examples, to be expanded
  class?: string; // Will be added later for sorting
  tokens?: Record<string, number>; // e.g. { "HeartSeeds": 10, "ThreadsOfFate": 5 }
  equipment?: {
    helmet?: string;
    armor?: string;
    weapon?: string;
    // ... other slots
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountData {
  id: string; // Firestore document ID (usually userId)
  ownedAdventurePacks?: string[]; // List of pack names
  // Other account-wide settings
}

export type CharacterSortableFields = "name" | "level" | "class" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface CharacterSortOption {
  field: CharacterSortableFields;
  direction: SortDirection;
}
