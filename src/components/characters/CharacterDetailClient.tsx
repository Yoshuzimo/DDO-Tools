"use client";

import React from "react";
import type {
  Character,
  DurationWeights,
  DurationType,
  CharacterUiPreferences,
} from "@/types";
import {
  DURATION_TYPES_CONST,
  DEFAULT_UI_PREFERENCES as GLOBAL_INITIAL_UI_DEFAULTS,
} from "@/types";
import {
  getCharacterById,
  updateCharacterLevel,
  updateCharacterImage,
  updateCharacterUiPreferencesAction,
} from "@/actions/characters";
import { getOwnedPacksAction } from "@/actions/account";
import { useAuthContext } from "@/hooks/useAuthContext";
import {
  useEffect,
  useState,
  useActionState,
  useRef,
  ChangeEvent,
  startTransition,
  useCallback,
  useMemo,
} from "react";
import NextImage from "next/image";
import {
  User,
  Wand2,
  ScrollText,
  Dices,
  AlertTriangle,
  Save,
  UploadCloud,
  Image as ImageIcon,
  Search,
  Shield,
  ShieldCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { FavorTrackerTab } from "./FavorTrackerTab";
import { ALL_DDO_QUESTS, DDOQuest } from "@/config/ddoQuests";
import { useToast } from "@/hooks/use-toast";

interface OverviewTabProps {
  character: Character;
  userId: string;
  onLevelUpdate: (newLevel: number) => void;
  onImageUpdate: (newImageUrl: string) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  character,
  userId,
  onLevelUpdate,
  onImageUpdate,
}) => {
  const [currentLevel, setCurrentLevel] = useState<number | string>(
    character.level
  );
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(character.imageUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const initialLevelUpdateState = {
    message: null,
    errors: null,
    success: false,
    updatedLevel: undefined,
  };
  const [levelUpdateState, levelFormAction, levelUpdatePending] =
    useActionState(updateCharacterLevel, initialLevelUpdateState);

  const initialImageUpdateState = {
    message: null,
    errors: null,
    success: false,
    updatedImageUrl: undefined,
  };
  const [imageUpdateState, imageFormAction, imageUpdatePending] =
    useActionState(updateCharacterImage, initialImageUpdateState);

  useEffect(() => {
    setCurrentLevel(character.level);
    setSelectedImagePreview(character.imageUrl || null);
  }, [character.level, character.imageUrl]);

  useEffect(() => {
    if (levelUpdateState.success && levelUpdateState.message) {
      toast({ title: "Success", description: levelUpdateState.message });
      if (levelUpdateState.updatedLevel !== undefined) {
        onLevelUpdate(levelUpdateState.updatedLevel);
        setCurrentLevel(levelUpdateState.updatedLevel);
      }
    } else if (!levelUpdateState.success && levelUpdateState.message) {
      toast({
        title: "Error",
        description: levelUpdateState.message,
        variant: "destructive",
      });
    } else if (levelUpdateState.errors) {
      let errorMsg = "Please check the fields: ";
      if (levelUpdateState.errors.level)
        errorMsg += `Level (${levelUpdateState.errors.level.join(", ")}) `;
      if (levelUpdateState.errors.general)
        errorMsg += levelUpdateState.errors.general.join(", ");
      toast({
        title: "Validation Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }, [levelUpdateState, onLevelUpdate, toast]);

  useEffect(() => {
    if (imageUpdateState.success && imageUpdateState.message) {
      toast({ title: "Success", description: imageUpdateState.message });
      if (imageUpdateState.updatedImageUrl) {
        onImageUpdate(imageUpdateState.updatedImageUrl);
        setSelectedImagePreview(imageUpdateState.updatedImageUrl);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } else if (!imageUpdateState.success && imageUpdateState.message) {
      toast({
        title: "Error",
        description: imageUpdateState.message,
        variant: "destructive",
      });
    } else if (imageUpdateState.errors) {
      let errorMsg = "Image Upload Error: ";
      if (imageUpdateState.errors.imageDataUri)
        errorMsg += `${imageUpdateState.errors.imageDataUri.join(", ")} `;
      if (imageUpdateState.errors.general)
        errorMsg += imageUpdateState.errors.general.join(", ");
      toast({
        title: "Validation Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }, [imageUpdateState, onImageUpdate, toast]);

  const handleLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentLevel(e.target.value);
  };

  const handleLevelSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("level", String(currentLevel));
    startTransition(() => {
      levelFormAction(formData);
    });
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setSelectedImagePreview(character.imageUrl || null);
    }
  };

  const handleImageSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !selectedImagePreview) {
      toast({
        title: "No Image",
        description: "Please select an image file to upload.",
        variant: "destructive",
      });
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set("imageDataUri", selectedImagePreview);
    startTransition(() => {
      imageFormAction(formData);
    });
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          Overview
        </h3>
      </div>
      <div className="p-6 pt-0 space-y-6">
        <form
          onSubmit={handleLevelSubmit}
          className="space-y-3 border-b pb-6 border-border"
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="characterId" value={character.id} />
          <div>
            <label
              htmlFor="level"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Current Level
            </label>
            <input
              id="level"
              name="level"
              type="number"
              value={currentLevel}
              onChange={handleLevelChange}
              min="1"
              max="40"
              required
              className="mt-1 w-24 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              disabled={levelUpdatePending}
            />
            {levelUpdateState.errors?.level && (
              <p className="text-xs text-destructive mt-1">
                {levelUpdateState.errors.level[0]}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
            disabled={levelUpdatePending}
          >
            <Save className="mr-2 h-4 w-4" />{" "}
            {levelUpdatePending ? "Updating Level..." : "Update Level"}
          </button>
        </form>

        <form onSubmit={handleImageSubmit} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="characterId" value={character.id} />
          <div>
            <label
              htmlFor="characterImageFile"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Character Picture
            </label>
            <input
              id="characterImageFile"
              name="characterImageFile"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleImageFileChange}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              ref={fileInputRef}
              disabled={imageUpdatePending}
              aria-label="Upload character image"
            />
            {imageUpdateState.errors?.imageDataUri && (
              <p className="text-xs text-destructive mt-1">
                {imageUpdateState.errors.imageDataUri[0]}
              </p>
            )}
          </div>
          {selectedImagePreview && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Image Preview:</p>
              <NextImage
                src={selectedImagePreview}
                alt="Character preview"
                width={128}
                height={128}
                className="rounded-md border object-cover h-32 w-32"
                priority
              />
            </div>
          )}
          {!selectedImagePreview && character.imageUrl && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Current Image:</p>
              <NextImage
                src={character.imageUrl}
                alt={character.name}
                width={128}
                height={128}
                className="rounded-md border object-cover h-32 w-32"
                priority
              />
            </div>
          )}
          {!selectedImagePreview && !character.imageUrl && (
            <div className="mt-4 flex items-center justify-center h-32 w-32 rounded-md border border-dashed text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
            disabled={imageUpdatePending || !selectedFile}
          >
            <UploadCloud className="mr-2 h-4 w-4" />{" "}
            {imageUpdatePending ? "Uploading..." : "Upload Image"}
          </button>
        </form>
      </div>
    </div>
  );
};

interface DurationWeightInputsProps {
  weights: DurationWeights;
  onWeightChange: (duration: DurationType, value: string) => void;
  errors: Partial<Record<DurationType, string>>;
  tabId: string;
}

const DurationWeightInputs: React.FC<DurationWeightInputsProps> = ({
  weights,
  onWeightChange,
  errors,
  tabId,
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-3 mb-4 p-4 border border-border/60 rounded-md bg-card/50">
    {DURATION_TYPES_CONST.map((duration) => {
      const inputId = `duration-${duration.replace(/\s+/g, "-")}-${tabId}`;
      const errorId = `error-${duration.replace(/\s+/g, "-")}-${tabId}`;
      return (
        <div key={duration} className="flex flex-col space-y-1">
          <input
            type="number"
            id={inputId}
            value={weights[duration]}
            onChange={(e) => onWeightChange(duration, e.target.value)}
            step="0.1"
            placeholder="1.0"
            className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`${duration} quest duration weight`}
            aria-describedby={errors[duration] ? errorId : undefined}
            aria-invalid={!!errors[duration]}
          />
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-muted-foreground self-start"
          >
            {duration}
          </label>
          {errors[duration] && (
            <p id={errorId} className="text-xs text-destructive mt-1">
              {errors[duration]}
            </p>
          )}
        </div>
      );
    })}
  </div>
);

const normalizeQuestNameForSort = (name: string | undefined): string => {
  if (!name) return "";
  const trimmedName = name.trim();
  if (trimmedName.toLowerCase().startsWith("the ")) {
    return trimmedName.substring(4);
  }
  return trimmedName;
};

type ExpGuideSortField =
  | "name"
  | "level"
  | "location"
  | "xpCasual"
  | "xpNormal"
  | "xpHard"
  | "xpElite";

interface ProcessedExpQuest extends DDOQuest {
  calculatedXpCasual: number | undefined;
  calculatedXpNormal: number | undefined;
  calculatedXpHard: number | undefined;
  calculatedXpElite: number | undefined;
}

const calculateAdjustedExp = (
  baseExp: number | undefined,
  questLevel: number,
  characterLevel: number
): number | undefined => {
  if (baseExp === undefined || baseExp === 0) {
    return baseExp;
  }
  if (questLevel > characterLevel) {
    return 0;
  }
  const levelDiff = characterLevel - questLevel;
  let multiplier = 1.0;

  if (levelDiff >= 7) multiplier = 0.0;
  else if (levelDiff === 6) multiplier = 0.01;
  else if (levelDiff === 5) multiplier = 0.25;
  else if (levelDiff === 4) multiplier = 0.5;
  else if (levelDiff === 3) multiplier = 0.75;
  else if (levelDiff === 2) multiplier = 0.9;

  return Math.floor(baseExp * multiplier);
};

interface ExpGuideTabProps {
  character: Character;
  durationWeights: DurationWeights;
  durationErrors: Partial<Record<DurationType, string>>;
  onDurationWeightChange: (duration: DurationType, value: string) => void;
  showRaids: boolean;
  onShowRaidsChange: (show: boolean) => void;
  onCormyrFilter: boolean;
  onOnCormyrFilterChange: (filter: boolean) => void;
}

const ExpGuideTab: React.FC<ExpGuideTabProps> = ({
  character,
  durationWeights,
  durationErrors,
  onDurationWeightChange,
  showRaids,
  onShowRaidsChange,
  onCormyrFilter,
  onOnCormyrFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<ExpGuideSortField>("level");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredAndSortedQuests = useMemo(() => {
    let processedQuests: ProcessedExpQuest[] = ALL_DDO_QUESTS.map((quest) => ({
      ...quest,
      calculatedXpCasual: calculateAdjustedExp(
        quest.xpCasual,
        quest.level,
        character.level
      ),
      calculatedXpNormal: calculateAdjustedExp(
        quest.xpNormal,
        quest.level,
        character.level
      ),
      calculatedXpHard: calculateAdjustedExp(
        quest.xpHard,
        quest.level,
        character.level
      ),
      calculatedXpElite: calculateAdjustedExp(
        quest.xpElite,
        quest.level,
        character.level
      ),
    }));

    processedQuests = processedQuests.filter((quest) => {
      if (!showRaids && quest.isRaid) return false;
      if (!onCormyrFilter && quest.name === "The Curse of the Five Fangs")
        return false;
      if (
        searchTerm &&
        !quest.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      if (quest.level > character.level) return false;

      const hasAnyPositiveExp =
        (quest.calculatedXpCasual !== undefined &&
          quest.calculatedXpCasual > 0) ||
        (quest.calculatedXpNormal !== undefined &&
          quest.calculatedXpNormal > 0) ||
        (quest.calculatedXpHard !== undefined && quest.calculatedXpHard > 0) ||
        (quest.calculatedXpElite !== undefined && quest.calculatedXpElite > 0);

      return hasAnyPositiveExp;
    });

    return processedQuests.sort((a, b) => {
      let comparison = 0;
      const normAName = normalizeQuestNameForSort(a.name).toLowerCase();
      const normBName = normalizeQuestNameForSort(b.name).toLowerCase();

      const getSortValue = (
        quest: ProcessedExpQuest,
        field: ExpGuideSortField
      ) => {
        switch (field) {
          case "name":
            return normalizeQuestNameForSort(quest.name).toLowerCase();
          case "level":
            return quest.level;
          case "location":
            return (quest.location || "").toLowerCase();
          case "xpCasual":
            return quest.calculatedXpCasual ?? -1;
          case "xpNormal":
            return quest.calculatedXpNormal ?? -1;
          case "xpHard":
            return quest.calculatedXpHard ?? -1;
          case "xpElite":
            return quest.calculatedXpElite ?? -1;
          default:
            return 0;
        }
      };

      const valA = getSortValue(a, sortField);
      const valB = getSortValue(b, sortField);

      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else if (typeof valA === "string" && typeof valB === "string") {
        comparison = valA.localeCompare(valB);
      }

      if (comparison === 0 && sortField !== "name") {
        comparison = normAName.localeCompare(normBName);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    searchTerm,
    showRaids,
    onCormyrFilter,
    sortField,
    sortDirection,
    character.level,
  ]);

  const handleSort = (field: ExpGuideSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortButton = ({
    field,
    label,
  }: {
    field: ExpGuideSortField;
    label: string;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center justify-start w-full px-1 py-0.5 text-left text-sm text-muted-foreground hover:text-accent group"
      aria-label={`Sort by ${label}`}
    >
      <span className="truncate group-hover:underline">{label}</span>
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="h-3 w-3 ml-1 flex-shrink-0 text-accent" />
        ) : (
          <ArrowDown className="h-3 w-3 ml-1 flex-shrink-0 text-accent" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/60 group-hover:text-accent flex-shrink-0" />
      )}
    </button>
  );

  return (
    <div className="border border-border/60 rounded-lg shadow-lg">
      <div className="p-6 border-b border-border/60">
        <h2 className="text-2xl font-headline text-accent flex items-center">
          <Activity className="mr-3 h-7 w-7" /> EXP Guide
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Explore quest experience points, adjusted for your character level:{" "}
          {character.level}.
        </p>
      </div>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showRaidsExpTab"
                checked={showRaids}
                onChange={(e) => onShowRaidsChange(e.target.checked)}
                className="form-checkbox h-4 w-4 text-primary focus:ring-accent border-input rounded"
              />
              <label
                htmlFor="showRaidsExpTab"
                className="cursor-pointer select-none text-sm font-medium leading-none"
              >
                Show Raids
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="onCormyrFilterExpTab"
                checked={onCormyrFilter}
                onChange={(e) => onOnCormyrFilterChange(e.target.checked)}
                className="form-checkbox h-4 w-4 text-primary focus:ring-accent border-input rounded"
              />
              <label
                htmlFor="onCormyrFilterExpTab"
                className="cursor-pointer select-none text-sm font-medium leading-none"
              >
                On Cormyr
              </label>
            </div>
          </div>
          <div className="relative flex-grow w-full sm:w-auto sm:max-w-xs md:max-w-sm self-start sm:self-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search quests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-input/70 focus:bg-input"
              aria-label="Search quests by name"
            />
          </div>
        </div>

        <DurationWeightInputs
          weights={durationWeights}
          onWeightChange={onDurationWeightChange}
          errors={durationErrors}
          tabId="exp"
        />

        <div className="h-[600px] border border-border/60 rounded-md overflow-auto">
          <table className="w-full text-sm table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-card shadow-sm">
              <tr>
                <th className="w-[30%] min-w-[200px] px-4 py-3 border-b border-r border-border/60 align-middle">
                  <SortButton field="name" label="Quest Name" />
                </th>
                <th className="w-[10%] min-w-[70px] text-center px-2 py-3 border-b border-r border-border/60 align-middle">
                  <SortButton field="level" label="Lvl" />
                </th>
                <th className="w-[20%] min-w-[150px] px-4 py-3 border-b border-r border-border/60 align-middle">
                  <SortButton field="location" label="Location" />
                </th>
                <th className="w-[10%] min-w-[70px] text-center px-2 py-3 border-b border-r border-border/60 align-middle">
                  <SortButton field="xpCasual" label="Casual" />
                </th>
                <th className="w-[10%] min-w-[70px] text-center px-2 py-3 border-b border-r border-border/60 align-middle">
                  <SortButton field="xpNormal" label="Normal" />
                </th>
                <th className="w-[10%] min-w-[70px] text-center px-2 py-3 border-b border-r border-border/60 align-middle">
                  <SortButton field="xpHard" label="Hard" />
                </th>
                <th className="w-[10%] min-w-[70px] text-center px-2 py-3 border-b border-border/60 align-middle">
                  <SortButton field="xpElite" label="Elite" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedQuests.map((quest) => (
                <tr
                  key={quest.id}
                  className="border-b border-border/60 hover:bg-muted/20"
                >
                  <td className="font-medium px-4 py-2 border-r border-border/60 truncate">
                    {quest.name}
                  </td>
                  <td className="text-center px-2 py-2 border-r border-border/60">
                    {quest.level}
                  </td>
                  <td className="text-muted-foreground px-4 py-2 border-r border-border/60 truncate">
                    {quest.location || "N/A"}
                  </td>
                  <td className="text-center px-2 py-2 border-r border-border/60 text-xs">
                    {quest.calculatedXpCasual !== undefined
                      ? quest.calculatedXpCasual.toLocaleString()
                      : "N/A"}
                  </td>
                  <td className="text-center px-2 py-2 border-r border-border/60 text-xs">
                    {quest.calculatedXpNormal !== undefined
                      ? quest.calculatedXpNormal.toLocaleString()
                      : "N/A"}
                  </td>
                  <td className="text-center px-2 py-2 border-r border-border/60 text-xs">
                    {quest.calculatedXpHard !== undefined
                      ? quest.calculatedXpHard.toLocaleString()
                      : "N/A"}
                  </td>
                  <td className="text-center px-2 py-2 text-xs">
                    {quest.calculatedXpElite !== undefined
                      ? quest.calculatedXpElite.toLocaleString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
              {filteredAndSortedQuests.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-muted-foreground py-8 px-6"
                  >
                    No quests match your current filters and level criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface CharacterDetailClientProps {
  characterIdFromPage: string;
}

export function CharacterDetailClient({
  characterIdFromPage,
}: CharacterDetailClientProps) {
  const { user, loading: authLoading } = useAuthContext();
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const [ownedPacks, setOwnedPacks] = useState<string[]>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);

  const [durationWeights, setDurationWeights] = useState<DurationWeights>(
    GLOBAL_INITIAL_UI_DEFAULTS.durationWeights!
  );
  const [durationErrors, setDurationErrors] = useState<
    Partial<Record<DurationType, string>>
  >({});

  const [showRaids, setShowRaids] = useState<boolean>(
    GLOBAL_INITIAL_UI_DEFAULTS.showRaids!
  );
  const [onCormyrFilter, setOnCormyrFilter] = useState<boolean>(
    GLOBAL_INITIAL_UI_DEFAULTS.onCormyrFilter!
  );
  const [showCompletedQuestsFavorTracker, setShowCompletedQuestsFavorTracker] =
    useState<boolean>(
      GLOBAL_INITIAL_UI_DEFAULTS.showCompletedQuestsFavorTracker!
    );

  const isSavingPrefs = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError("User not authenticated. Please log in.");
      setIsLoading(false);
      setIsLoadingPacks(false);
      return;
    }

    if (user && characterIdFromPage) {
      setIsLoading(true);
      setIsLoadingPacks(true);
      // console.log(`[CharacterDetailClient] Fetching character with ID: ${characterIdFromPage} for user: ${user.uid}`); // Debug

      getCharacterById(user.uid, characterIdFromPage)
        .then((charData) => {
          if (charData) {
            // console.log("[CharacterDetailClient] Character data fetched:", charData); // Debug
            setCharacter(charData);
            const prefs = {
              ...GLOBAL_INITIAL_UI_DEFAULTS,
              ...(charData.uiPreferences || {}),
            };
            setDurationWeights(prefs.durationWeights!);
            setShowRaids(prefs.showRaids!);
            setOnCormyrFilter(prefs.onCormyrFilter!);
            setShowCompletedQuestsFavorTracker(
              prefs.showCompletedQuestsFavorTracker!
            );
          } else {
            console.error(
              `[CharacterDetailClient] Character not found or access denied for ID: ${characterIdFromPage}`
            );
            setError("Character not found or access denied.");
          }
        })
        .catch((err) => {
          console.error(
            "[CharacterDetailClient] Error fetching character:",
            err
          );
          setError("Failed to load character data.");
        })
        .finally(() => {
          setIsLoading(false);
        });

      getOwnedPacksAction(user.uid)
        .then((packs) => {
          setOwnedPacks(packs);
        })
        .catch((err) => {
          console.error(
            "[CharacterDetailClient] Error fetching owned packs:",
            err
          );
        })
        .finally(() => {
          setIsLoadingPacks(false);
        });
    } else {
      setIsLoading(false);
      setIsLoadingPacks(false);
      if (!characterIdFromPage) {
        console.error(
          "[CharacterDetailClient] characterIdFromPage is missing."
        );
        setError("Character ID is missing.");
      }
    }
  }, [user, characterIdFromPage, authLoading]);

  const debouncedSavePreferences = useCallback(() => {
    if (!user || !character || isSavingPrefs.current) return;

    isSavingPrefs.current = true;
    // console.log("[CharacterDetailClient] Debounced save triggered for UI preferences."); // Debug

    const currentPreferences: CharacterUiPreferences = {
      durationWeights,
      showRaids,
      onCormyrFilter,
      showCompletedQuestsFavorTracker,
    };

    updateCharacterUiPreferencesAction(
      user.uid,
      character.id,
      currentPreferences
    )
      .then((result) => {
        if (result.success) {
          // console.log("[CharacterDetailClient] UI Preferences saved successfully:", result.updatedPreferences); // Debug
        } else {
          console.error(
            "[CharacterDetailClient] Failed to save UI preferences:",
            result.message,
            result.errors
          );
          toast({
            title: "Error",
            description: "Could not save UI preferences. " + result.message,
            variant: "destructive",
          });
        }
      })
      .catch((error) => {
        console.error(
          "[CharacterDetailClient] Critical error saving UI preferences:",
          error
        );
        toast({
          title: "Client Error",
          description: "Exception while saving UI preferences.",
          variant: "destructive",
        });
      })
      .finally(() => {
        isSavingPrefs.current = false;
      });
  }, [
    user,
    character,
    durationWeights,
    showRaids,
    onCormyrFilter,
    showCompletedQuestsFavorTracker,
    toast,
  ]);

  useEffect(() => {
    if (character && !isLoading) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSavePreferences();
      }, 1500);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    character,
    isLoading,
    durationWeights,
    showRaids,
    onCormyrFilter,
    showCompletedQuestsFavorTracker,
    debouncedSavePreferences,
  ]);

  const handleDurationWeightChange = useCallback(
    (duration: DurationType, valueStr: string) => {
      const initialDefaultValue =
        GLOBAL_INITIAL_UI_DEFAULTS.durationWeights![duration];
      if (valueStr.trim() === "") {
        setDurationErrors((prev) => ({ ...prev, [duration]: undefined }));
        setDurationWeights((prev) => ({
          ...prev,
          [duration]: initialDefaultValue,
        }));
        return;
      }
      const numericValue = parseFloat(valueStr);
      if (!isNaN(numericValue)) {
        setDurationErrors((prev) => ({ ...prev, [duration]: undefined }));
        setDurationWeights((prev) => ({ ...prev, [duration]: numericValue }));
      } else {
        setDurationErrors((prev) => ({
          ...prev,
          [duration]: "Enter a valid number.",
        }));
      }
    },
    []
  );

  const handleLevelUpdateInParent = useCallback((newLevel: number) => {
    setCharacter((prevCharacter) =>
      prevCharacter
        ? { ...prevCharacter, level: newLevel, updatedAt: new Date() }
        : null
    );
  }, []);

  const handleImageUpdateInParent = useCallback((newImageUrl: string) => {
    setCharacter((prevCharacter) =>
      prevCharacter
        ? { ...prevCharacter, imageUrl: newImageUrl, updatedAt: new Date() }
        : null
    );
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(" ");
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (name.length > 0) {
      return name.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Dices className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg font-headline">
          Loading Character Details...
        </p>
      </div>
    );
  }

  if (error) {
    if (
      (error.includes("not found") || error.includes("access denied")) &&
      !character
    ) {
      // console.log(`[CharacterDetailClient] Triggering notFound() due to error: ${error}`); // Debug
      notFound();
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-xl font-bold text-destructive">
          Error Loading Character
        </p>
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!character) {
    // console.log("[CharacterDetailClient] Character is null and no error state triggered notFound(). Calling notFound() now."); // Debug
    notFound();
    return null;
  }

  const TabButton = ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`flex-1 py-3 px-1 rounded-none border-b-2 transition-colors duration-150
                  ${
                    activeTab === value
                      ? "border-accent text-accent font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  }`}
    >
      <span className="flex items-center justify-center">{children}</span>
    </button>
  );

  return (
    <div className="space-y-8">
      <div className="rounded-lg border bg-card text-card-foreground shadow-xl overflow-hidden">
        <div className="bg-primary/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {character.imageUrl ? (
              <NextImage
                src={character.imageUrl}
                alt={character.name}
                width={80}
                height={80}
                className="h-20 w-20 rounded-md border-4 border-accent object-cover"
                data-ai-hint="fantasy character"
                priority
              />
            ) : (
              <div
                className="h-20 w-20 rounded-md border-4 border-accent bg-primary text-primary-foreground flex items-center justify-center text-3xl font-semibold"
                data-ai-hint="fantasy character"
              >
                {getInitials(character.name)}
              </div>
            )}
            <div>
              <h2 className="text-3xl font-bold font-headline text-accent">
                {character.name}
              </h2>
              <p className="text-lg text-foreground/80">
                Level {character.level} {character.class || "Adventurer"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-0">
          <div className="w-full">
            <div className="grid w-full grid-cols-3 rounded-none border-b border-border">
              <TabButton value="overview">
                <User className="mr-2 h-4 w-4" /> Overview
              </TabButton>
              <TabButton value="favor">
                <ScrollText className="mr-2 h-4 w-4" /> Favor Tracker
              </TabButton>
              <TabButton value="exp">
                <Activity className="mr-2 h-4 w-4" /> EXP Guide
              </TabButton>
            </div>
            <div className="p-6">
              {activeTab === "overview" && user && character && (
                <OverviewTab
                  character={character}
                  userId={user.uid}
                  onLevelUpdate={handleLevelUpdateInParent}
                  onImageUpdate={handleImageUpdateInParent}
                />
              )}
              {activeTab === "favor" && user && character && (
                <FavorTrackerTab
                  character={character}
                  ownedPacks={ownedPacks}
                  isLoadingPacks={isLoadingPacks}
                  durationWeights={durationWeights}
                  durationErrors={durationErrors}
                  onDurationWeightChange={handleDurationWeightChange}
                  showRaids={showRaids}
                  onShowRaidsChange={setShowRaids}
                  showCompletedQuests={showCompletedQuestsFavorTracker}
                  onShowCompletedQuestsChange={
                    setShowCompletedQuestsFavorTracker
                  }
                  onCormyrFilter={onCormyrFilter}
                  onOnCormyrFilterChange={setOnCormyrFilter}
                />
              )}
              {activeTab === "exp" && character && (
                <ExpGuideTab
                  character={character}
                  durationWeights={durationWeights}
                  durationErrors={durationErrors}
                  onDurationWeightChange={handleDurationWeightChange}
                  showRaids={showRaids}
                  onShowRaidsChange={setShowRaids}
                  onCormyrFilter={onCormyrFilter}
                  onOnCormyrFilterChange={setOnCormyrFilter}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
