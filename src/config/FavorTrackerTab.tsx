"use client";

import * as React from "react";
const { useState, useMemo, useEffect, useCallback, startTransition, useRef } =
  React;
import Papa from "papaparse";
import type {
  Character,
  QuestCompletionStatus as QuestCompletionStatusType,
  DurationWeights,
  DurationType,
} from "@/types";
import { DURATION_TYPES_CONST } from "@/types";
import {
  ALL_DDO_QUESTS,
  DDOQuest,
  Difficulty as DDOConfigDifficulty,
} from "@/config/ddoQuests";
import {
  Search,
  ScrollText,
  Shield,
  ShieldCheck,
  ListX,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";
import {
  saveSingleQuestCompletionAction,
  resetAllQuestCompletionsAction,
  batchUpdateQuestCompletionsAction,
} from "@/actions/characters";
import { useToast } from "@/hooks/use-toast";

const ALL_POSSIBLE_DIFFICULTIES: DDOConfigDifficulty[] = [
  "casual",
  "normal",
  "hard",
  "elite",
];
const DIFFICULTY_LABELS: Record<DDOConfigDifficulty, string> = {
  casual: "Solo",
  normal: "Normal",
  hard: "Hard",
  elite: "Elite",
};
const DIFFICULTY_SHORT_LABELS: Record<DDOConfigDifficulty, string> = {
  casual: "S",
  normal: "N",
  hard: "H",
  elite: "E",
};

interface FavorTrackerTabProps {
  character: Character;
  ownedPacks: string[];
  isLoadingPacks: boolean;
  durationWeights: DurationWeights;
  durationErrors: Partial<Record<DurationType, string>>;
  onDurationWeightChange: (duration: DurationType, value: string) => void;
  showRaids: boolean;
  onShowRaidsChange: (show: boolean) => void;
  showCompletedQuests: boolean;
  onShowCompletedQuestsChange: (show: boolean) => void;
  onCormyrFilter: boolean;
  onOnCormyrFilterChange: (filter: boolean) => void;
}

interface QuestWithCalculatedFavor extends DDOQuest {
  earnedFavor: number;
  maxQuestFavor: number;
}

type SortableQuestFields =
  | "name"
  | "pack"
  | "level"
  | "location"
  | "questGiver"
  | "areaFavor";

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
            aria-label={`${duration} quest duration weight for favor tracker`}
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

const calculateMaxFavorForQuest = (
  quest: DDOQuest,
  currentDurationWeights: DurationWeights
): number => {
  const difficulties = quest.availableDifficulties || ALL_POSSIBLE_DIFFICULTIES;
  let baseMaxFavor = 0;
  if (difficulties.includes("elite")) baseMaxFavor = quest.baseFavor * 3;
  else if (difficulties.includes("hard")) baseMaxFavor = quest.baseFavor * 2;
  else if (difficulties.includes("normal")) baseMaxFavor = quest.baseFavor * 1;
  else if (difficulties.includes("casual"))
    baseMaxFavor = quest.baseFavor * 0.5;
  else baseMaxFavor = quest.baseFavor > 0 ? quest.baseFavor * 0.5 : 0;

  const questDurationKey = quest.questLength as DurationType;
  const weight =
    quest.questLength && DURATION_TYPES_CONST.includes(questDurationKey)
      ? currentDurationWeights[questDurationKey]
      : 1.0;

  return baseMaxFavor * weight;
};

export const FavorTrackerTab: React.FC<FavorTrackerTabProps> = ({
  character,
  ownedPacks,
  isLoadingPacks: isLoadingAccountPacks,
  durationWeights,
  durationErrors,
  onDurationWeightChange,
  showRaids,
  onShowRaidsChange,
  showCompletedQuests,
  onShowCompletedQuestsChange,
  onCormyrFilter,
  onOnCormyrFilterChange,
}) => {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  const [questCompletions, setQuestCompletions] = useState<
    Record<string, QuestCompletionStatusType>
  >({});
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [isResetting, setIsResetting] = useState(false);

  const [primarySortField, setPrimarySortField] =
    useState<SortableQuestFields>("level");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const questNameMap = useMemo(() => {
    const map = new Map<string, string>();
    ALL_DDO_QUESTS.forEach((quest) =>
      map.set(quest.name.toLowerCase(), quest.id)
    );
    return map;
  }, []);

  useEffect(() => {
    if (character && character.questCompletionStatus) {
      setQuestCompletions(character.questCompletionStatus);
    } else {
      setQuestCompletions({});
    }
  }, [character]);

  const calculateEarnedFavorForQuest = useCallback(
    (
      quest: DDOQuest,
      completions: QuestCompletionStatusType | undefined,
      currentDurationWeights: DurationWeights
    ): number => {
      if (!completions) return 0;
      let earnedBase = 0;
      const availableDifficulties =
        quest.availableDifficulties || ALL_POSSIBLE_DIFFICULTIES;

      if (completions.elite && availableDifficulties.includes("elite"))
        earnedBase = quest.baseFavor * 3;
      else if (completions.hard && availableDifficulties.includes("hard"))
        earnedBase = quest.baseFavor * 2;
      else if (completions.normal && availableDifficulties.includes("normal"))
        earnedBase = quest.baseFavor * 1;
      else if (completions.casual && availableDifficulties.includes("casual"))
        earnedBase = quest.baseFavor * 0.5;

      const questDurationKey = quest.questLength as DurationType;
      const weight =
        quest.questLength && DURATION_TYPES_CONST.includes(questDurationKey)
          ? currentDurationWeights[questDurationKey]
          : 1.0;

      return earnedBase * weight;
    },
    []
  );

  const questsWithCalculations: QuestWithCalculatedFavor[] = useMemo(() => {
    return ALL_DDO_QUESTS.map((quest) => ({
      ...quest,
      earnedFavor: calculateEarnedFavorForQuest(
        quest,
        questCompletions[quest.id],
        durationWeights
      ),
      maxQuestFavor: calculateMaxFavorForQuest(quest, durationWeights),
    }));
  }, [questCompletions, calculateEarnedFavorForQuest, durationWeights]);

  const currentlyApplicableQuests = useMemo(() => {
    let itemsToFilter = questsWithCalculations;

    itemsToFilter = itemsToFilter.filter((quest) => {
      const packOwned =
        quest.pack === "Free to Play" || ownedPacks.includes(quest.pack);
      if (!packOwned && !isLoadingAccountPacks) return false;
      if (!showRaids && quest.isRaid) return false;
      if (
        searchTerm &&
        !quest.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;

      if (!onCormyrFilter && quest.name === "The Curse of the Five Fangs") {
        return false;
      }

      if (!showCompletedQuests) {
        const completionsForFilter = questCompletions[quest.id];
        const availableDifficultiesForThisQuest =
          quest.availableDifficulties || ALL_POSSIBLE_DIFFICULTIES;
        const isFullyCompleted = availableDifficultiesForThisQuest.every(
          (diff) => completionsForFilter?.[diff]
        );

        if (isFullyCompleted && quest.maxQuestFavor > 0) {
          return false;
        }
      }
      return true;
    });
    return itemsToFilter;
  }, [
    questsWithCalculations,
    ownedPacks,
    isLoadingAccountPacks,
    showRaids,
    searchTerm,
    showCompletedQuests,
    questCompletions,
    onCormyrFilter,
  ]);

  const maxPossibleFavorByLocation: Record<string, number> = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const quest of currentlyApplicableQuests) {
      if (quest.favorArea) {
        if (!totals[quest.favorArea]) {
          totals[quest.favorArea] = 0;
        }
        totals[quest.favorArea] += quest.maxQuestFavor;
      }
    }
    return totals;
  }, [currentlyApplicableQuests]);

  const earnedFavorByLocation: Record<string, number> = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const quest of currentlyApplicableQuests) {
      if (quest.favorArea) {
        if (!totals[quest.favorArea]) {
          totals[quest.favorArea] = 0;
        }
        totals[quest.favorArea] += quest.earnedFavor;
      }
    }
    return totals;
  }, [currentlyApplicableQuests]);

  const remainingFavorByLocation: Record<string, number> = useMemo(() => {
    const remaining: Record<string, number> = {};
    for (const area in maxPossibleFavorByLocation) {
      remaining[area] =
        maxPossibleFavorByLocation[area] - (earnedFavorByLocation[area] || 0);
    }
    return remaining;
  }, [maxPossibleFavorByLocation, earnedFavorByLocation]);

  const handleCompletionChange = useCallback(
    (questId: string, difficulty: DDOConfigDifficulty, isChecked: boolean) => {
      if (!user || !character) return;

      const quest = ALL_DDO_QUESTS.find((q) => q.id === questId);
      if (!quest) return;

      const availableDifficulties =
        quest.availableDifficulties || ALL_POSSIBLE_DIFFICULTIES;
      const originalQuestStatus = questCompletions[questId] || {
        casual: false,
        normal: false,
        hard: false,
        elite: false,
      };
      const newQuestStatus = { ...originalQuestStatus };

      if (isChecked) {
        newQuestStatus[difficulty] = true;
        if (difficulty === "elite" && availableDifficulties.includes("hard"))
          newQuestStatus.hard = true;
        if (
          (difficulty === "elite" || difficulty === "hard") &&
          availableDifficulties.includes("normal")
        )
          newQuestStatus.normal = true;
        if (
          (difficulty === "elite" ||
            difficulty === "hard" ||
            difficulty === "normal") &&
          availableDifficulties.includes("casual")
        )
          newQuestStatus.casual = true;
      } else {
        newQuestStatus[difficulty] = false;
        if (difficulty === "casual" && availableDifficulties.includes("normal"))
          newQuestStatus.normal = false;
        if (
          (difficulty === "casual" || difficulty === "normal") &&
          availableDifficulties.includes("hard")
        )
          newQuestStatus.hard = false;
        if (
          (difficulty === "casual" ||
            difficulty === "normal" ||
            difficulty === "hard") &&
          availableDifficulties.includes("elite")
        )
          newQuestStatus.elite = false;
      }

      startTransition(() => {
        setQuestCompletions((prev) => ({ ...prev, [questId]: newQuestStatus }));
        setIsSaving((prev) => ({ ...prev, [questId]: true }));

        saveSingleQuestCompletionAction(
          user.uid,
          character.id,
          questId,
          newQuestStatus
        )
          .then((result) => {
            if (!result.success) {
              toast({
                title: "Save Error",
                description: result.message,
                variant: "destructive",
              });
              setQuestCompletions((prev) => ({
                ...prev,
                [questId]: originalQuestStatus,
              }));
            }
          })
          .catch((error) => {
            console.error("Error saving quest completion:", error);
            toast({
              title: "Client Error",
              description: "Could not save quest completion.",
              variant: "destructive",
            });
            setQuestCompletions((prev) => ({
              ...prev,
              [questId]: originalQuestStatus,
            }));
          })
          .finally(() => {
            setIsSaving((prev) => ({ ...prev, [questId]: false }));
          });
      });
    },
    [user, character, questCompletions, toast, setQuestCompletions, setIsSaving]
  );

  const handleResetAllCompletions = useCallback(async () => {
    if (!user || !character) {
      toast({
        title: "Error",
        description: "User or character data missing.",
        variant: "destructive",
      });
      return;
    }

    const originalCompletions = { ...questCompletions };
    startTransition(() => {
      setQuestCompletions({});
      setIsResetting(true);
      resetAllQuestCompletionsAction(user.uid, character.id)
        .then((result) => {
          if (result.success) {
            toast({ title: "Completions Reset", description: result.message });
          } else {
            toast({
              title: "Reset Error",
              description: result.message,
              variant: "destructive",
            });
            setQuestCompletions(originalCompletions);
          }
        })
        .catch((error) => {
          console.error("Error resetting quest completions:", error);
          toast({
            title: "Client Error",
            description: "Could not reset quest completions.",
            variant: "destructive",
          });
          setQuestCompletions(originalCompletions);
        })
        .finally(() => {
          setIsResetting(false);
        });
    });
  }, [
    user,
    character,
    questCompletions,
    toast,
    setQuestCompletions,
    setIsResetting,
  ]);

  const handleSort = (field: SortableQuestFields) => {
    if (primarySortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setPrimarySortField(field);
      setSortDirection("asc");
    }
  };

  const handleCsvImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user || !character) {
      if (!file)
        toast({
          title: "No File",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
      if (!user || !character)
        toast({
          title: "Error",
          description: "User or character data missing.",
          variant: "destructive",
        });
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      return;
    }
    if (file.type !== "text/csv") {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .csv file.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      return;
    }

    setIsImportingCsv(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { data, errors: parseErrors } = results;

        if (parseErrors.length > 0) {
          const errorMessages = parseErrors
            .map((err) => `Row ${err.row}: ${err.message}`)
            .join("; ");
          toast({
            title: "CSV Parse Error",
            description: `Could not parse CSV. Details: ${errorMessages}`,
            variant: "destructive",
          });
          setIsImportingCsv(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const updates: Array<{
          questId: string;
          status: QuestCompletionStatusType;
        }> = [];
        const processingErrors: string[] = [];

        data.forEach((row: any, index: number) => {
          const questName = row["Quest Name"]?.trim();
          if (!questName) {
            processingErrors.push(`Row ${index + 2}: Quest Name is missing.`);
            return;
          }

          const questId = questNameMap.get(questName.toLowerCase());
          if (!questId) {
            processingErrors.push(
              `Row ${
                index + 2
              }: Quest "${questName}" not found in known DDO quests. Please ensure exact name match.`
            );
            return;
          }

          const parseBool = (val: string | undefined): boolean => {
            if (val === undefined || val === null) return false;
            const lowerVal = String(val).trim().toLowerCase();
            return lowerVal === "true" || lowerVal === "1";
          };

          const status: QuestCompletionStatusType = {
            casual: parseBool(row["Casual"]),
            normal: parseBool(row["Normal"]),
            hard: parseBool(row["Hard"]),
            elite: parseBool(row["Elite"]),
          };
          updates.push({ questId, status });
        });

        if (processingErrors.length > 0) {
          toast({
            title: "CSV Processing Errors",
            description: `Found ${
              processingErrors.length
            } issues: ${processingErrors
              .slice(0, 3)
              .join("; ")}... Check console for all.`,
            variant: "destructive",
          });
          console.error("CSV Processing Errors:", processingErrors);
        }

        if (updates.length > 0) {
          const result = await batchUpdateQuestCompletionsAction(
            user.uid,
            character.id,
            updates
          );
          if (result.success) {
            toast({ title: "Import Successful", description: result.message });
            // Optimistically update local state or re-fetch
            const newLocalCompletions = { ...questCompletions };
            updates.forEach((upd) => {
              newLocalCompletions[upd.questId] = upd.status;
            });
            setQuestCompletions(newLocalCompletions);
          } else {
            toast({
              title: "Import Failed",
              description: result.message,
              variant: "destructive",
            });
          }
        } else if (processingErrors.length === 0) {
          toast({
            title: "No Updates",
            description:
              "CSV parsed, but no valid quest completion updates found.",
            variant: "default",
          });
        }

        setIsImportingCsv(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      },
      error: (error: Error) => {
        toast({
          title: "CSV Read Error",
          description: error.message,
          variant: "destructive",
        });
        setIsImportingCsv(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const SortButton: React.FC<{ field: SortableQuestFields; label: string }> = ({
    field,
    label,
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center justify-start w-full px-1 py-0.5 text-left text-sm text-muted-foreground hover:text-accent group"
      aria-label={`Sort by ${label}`}
    >
      <span className="truncate group-hover:underline">{label}</span>
      {primarySortField === field ? (
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

  const sortedDisplayedQuests = useMemo(() => {
    return [...currentlyApplicableQuests].sort((a, b) => {
      let comparison = 0;
      let valA: string | number | undefined | null;
      let valB: string | number | undefined | null;

      switch (primarySortField) {
        case "areaFavor":
          valA = a.favorArea
            ? remainingFavorByLocation[a.favorArea] ?? -Infinity
            : -Infinity;
          valB = b.favorArea
            ? remainingFavorByLocation[b.favorArea] ?? -Infinity
            : -Infinity;
          break;
        case "name":
          valA = normalizeQuestNameForSort(a.name).toLowerCase();
          valB = normalizeQuestNameForSort(b.name).toLowerCase();
          break;
        case "pack":
        case "location":
        case "questGiver":
          valA = a[primarySortField]?.toLowerCase() || "";
          valB = b[primarySortField]?.toLowerCase() || "";
          break;
        case "level":
          valA = a.level;
          valB = b.level;
          break;
        default:
          valA = a.level;
          valB = b.level;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else if (typeof valA === "string" && typeof valB === "string") {
        comparison = valA.localeCompare(valB);
      } else if (valA === undefined || valA === null) {
        comparison = sortDirection === "asc" ? -1 : 1;
      } else if (valB === undefined || valB === null) {
        comparison = sortDirection === "asc" ? 1 : -1;
      }

      if (sortDirection === "desc") {
        comparison *= -1;
      }

      if (comparison === 0 && primarySortField !== "name") {
        const normalizedAName = normalizeQuestNameForSort(a.name).toLowerCase();
        const normalizedBName = normalizeQuestNameForSort(b.name).toLowerCase();
        return normalizedAName.localeCompare(normalizedBName);
      }
      return comparison;
    });
  }, [
    currentlyApplicableQuests,
    primarySortField,
    sortDirection,
    remainingFavorByLocation,
  ]);

  if (isLoadingAccountPacks) {
    return (
      <div className="border border-border/60 rounded-lg shadow-lg">
        <div className="p-6 border-b border-border/60">
          <h2 className="text-2xl font-headline text-accent flex items-center">
            <ScrollText className="mr-3 h-7 w-7" /> Favor Tracker
          </h2>
        </div>
        <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">
            Loading your owned pack data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border/60 rounded-lg shadow-lg">
      <div className="p-6 border-b border-border/60">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <h2 className="text-2xl font-headline text-accent flex items-center mb-4 sm:mb-0">
            <ScrollText className="mr-3 h-7 w-7" /> Favor Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Character Level: {character.level}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your quest completions. Available quests based on owned
          adventure packs. Max favor adjusts based on available difficulties.
        </p>
      </div>
      <div className="p-6 space-y-6">
        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
          <div className="relative flex-grow w-full xl:max-w-xs md:max-w-sm">
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showRaidsFavorTabFT"
                checked={showRaids}
                onChange={(e) => onShowRaidsChange(e.target.checked)}
                className="form-checkbox h-4 w-4 text-primary focus:ring-accent border-input rounded"
              />
              <label
                htmlFor="showRaidsFavorTabFT"
                className="cursor-pointer select-none text-sm font-medium leading-none"
              >
                Show Raids
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showFullyCompletedFavorTabFT"
                checked={showCompletedQuests}
                onChange={(e) => onShowCompletedQuestsChange(e.target.checked)}
                className="form-checkbox h-4 w-4 text-primary focus:ring-accent border-input rounded"
              />
              <label
                htmlFor="showFullyCompletedFavorTabFT"
                className="cursor-pointer select-none text-sm font-medium leading-none"
              >
                Show Completed
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="onCormyrFilterFavorTabFT"
                checked={onCormyrFilter}
                onChange={(e) => onOnCormyrFilterChange(e.target.checked)}
                className="form-checkbox h-4 w-4 text-primary focus:ring-accent border-input rounded"
              />
              <label
                htmlFor="onCormyrFilterFavorTabFT"
                className="cursor-pointer select-none text-sm font-medium leading-none"
              >
                On Cormyr
              </label>
            </div>
            <button
              onClick={handleResetAllCompletions}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive h-9 px-3"
              disabled={isResetting}
            >
              {isResetting ? (
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ListX className="mr-2 h-4 w-4" />
              )}
              {isResetting ? "Resetting..." : "Reset All"}
            </button>

            <div className="flex items-center space-x-2">
              <label
                htmlFor="csvImportFavor"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
                title="CSV format: Quest Name,Casual,Normal,Hard,Elite (use TRUE/FALSE for difficulties)"
              >
                {isImportingCsv ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {isImportingCsv ? "Importing..." : "Import CSV"}
              </label>
              <input
                type="file"
                id="csvImportFavor"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCsvImport}
                className="hidden"
                disabled={isImportingCsv}
              />
              <div className="group relative flex items-center">
                <AlertTriangle className="h-4 w-4 text-muted-foreground hover:text-accent cursor-help" />
                <span className="absolute bottom-full left-1/2 z-10 mb-2 w-72 -translate-x-1/2 transform rounded-md bg-popover p-2 text-xs text-popover-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                  CSV Format: Headers `Quest Name,Casual,Normal,Hard,Elite`. Use
                  `TRUE` or `FALSE` (case-insensitive) or `1` or `0` for
                  difficulty completion. Quest Names must match exactly.
                </span>
              </div>
            </div>
          </div>
        </div>

        <DurationWeightInputs
          weights={durationWeights}
          onWeightChange={onDurationWeightChange}
          errors={durationErrors}
          tabId="favor"
        />

        <div className="h-[600px] border border-border/60 rounded-md overflow-auto">
          <table className="w-full text-sm table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-card shadow-sm">
              <tr>
                <th
                  rowSpan={2}
                  className="w-[18%] min-w-[160px] px-4 py-3 border-b border-r border-border/60 align-middle"
                >
                  <SortButton field="name" label="Quest Name" />
                </th>
                <th
                  rowSpan={2}
                  className="w-[10%] min-w-[100px] px-4 py-3 border-b border-r border-border/60 align-middle"
                >
                  <SortButton field="pack" label="Pack" />
                </th>
                <th
                  rowSpan={2}
                  className="w-[5%] min-w-[60px] text-center px-2 py-3 border-b border-r border-border/60 align-middle"
                >
                  <SortButton field="level" label="Lvl" />
                </th>
                <th
                  rowSpan={2}
                  className="w-[12%] min-w-[110px] px-4 py-3 border-b border-r border-border/60 align-middle"
                >
                  <SortButton field="location" label="Location" />
                </th>
                <th
                  rowSpan={2}
                  className="w-[13%] min-w-[120px] px-4 py-3 border-b border-r border-border/60 align-middle"
                >
                  <SortButton field="questGiver" label="Quest Giver" />
                </th>
                <th
                  rowSpan={2}
                  className="w-[10%] min-w-[90px] text-center px-2 py-3 border-b border-r border-border/60 align-middle whitespace-nowrap"
                >
                  <SortButton field="areaFavor" label="Area Favor" />
                </th>
                <th
                  rowSpan={2}
                  className="w-[5%] min-w-[50px] text-center px-2 py-3 border-b border-r border-border/60 align-middle"
                >
                  Raid
                </th>
                <th
                  colSpan={4}
                  className="w-[17%] min-w-[160px] text-center px-2 py-3 border-b border-border/60 font-medium text-muted-foreground"
                >
                  Completions
                </th>
              </tr>
              <tr>
                {ALL_POSSIBLE_DIFFICULTIES.map((difficulty, index) => (
                  <th
                    key={difficulty}
                    title={DIFFICULTY_LABELS[difficulty]}
                    className={`w-[4.25%] min-w-[40px] text-center px-1 py-3 border-b border-border/60 font-medium text-muted-foreground ${
                      index < ALL_POSSIBLE_DIFFICULTIES.length - 1
                        ? "border-r border-border/60"
                        : ""
                    }`}
                  >
                    <button className="w-full text-center font-medium text-muted-foreground hover:text-accent p-0 h-auto">
                      {DIFFICULTY_SHORT_LABELS[difficulty]}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoadingAccountPacks && (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center text-muted-foreground py-8 px-6"
                  >
                    Loading quest availability based on packs...
                  </td>
                </tr>
              )}
              {!isLoadingAccountPacks && sortedDisplayedQuests.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center text-muted-foreground py-8 px-6"
                  >
                    No quests match your current filters.
                  </td>
                </tr>
              )}
              {!isLoadingAccountPacks &&
                sortedDisplayedQuests.map((quest) => {
                  const completions = questCompletions[quest.id] || {
                    casual: false,
                    normal: false,
                    hard: false,
                    elite: false,
                  };
                  const currentQuestIsSaving = isSaving[quest.id] || false;
                  const locationFavorDisplay = quest.favorArea
                    ? remainingFavorByLocation[quest.favorArea] ?? 0
                    : 0;
                  const questAvailableDifficulties =
                    quest.availableDifficulties || ALL_POSSIBLE_DIFFICULTIES;

                  return (
                    <tr
                      key={quest.id}
                      className={`hover:bg-muted/20 ${
                        currentQuestIsSaving ? "opacity-70" : ""
                      } border-b border-border/60`}
                    >
                      <td className="font-medium px-4 py-2 border-r border-border/60 text-left truncate">
                        {quest.name}
                      </td>
                      <td className="text-muted-foreground px-4 py-2 border-r border-border/60 truncate text-left">
                        {quest.pack}
                      </td>
                      <td className="text-center px-2 py-2 border-r border-border/60">
                        {quest.level}
                      </td>
                      <td className="text-muted-foreground px-4 py-2 border-r border-border/60 truncate text-left">
                        {quest.location || "N/A"}
                      </td>
                      <td className="text-muted-foreground px-4 py-2 border-r border-border/60 truncate text-left">
                        {quest.questGiver || "N/A"}
                      </td>
                      <td className="text-center px-2 py-2 font-medium border-r border-border/60">
                        {locationFavorDisplay.toFixed(1)}
                      </td>
                      <td
                        className="text-center px-2 py-2 border-r border-border/60"
                        title={quest.isRaid ? "Raid Quest" : "Standard Quest"}
                      >
                        {quest.isRaid ? (
                          <ShieldCheck className="h-5 w-5 text-green-400 inline-block" />
                        ) : (
                          <Shield className="h-5 w-5 text-muted-foreground inline-block" />
                        )}
                      </td>
                      {ALL_POSSIBLE_DIFFICULTIES.map((difficulty, index) => {
                        const isActuallyAvailable =
                          questAvailableDifficulties.includes(difficulty);
                        const isCompleted = !!completions[difficulty];

                        return (
                          <td
                            key={difficulty}
                            className={`text-center px-1 py-2 ${
                              index < ALL_POSSIBLE_DIFFICULTIES.length - 1
                                ? "border-r border-border/60"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-primary focus:ring-accent border-input rounded disabled:opacity-70 disabled:cursor-not-allowed"
                              checked={isActuallyAvailable && isCompleted}
                              onChange={(e) => {
                                if (isActuallyAvailable) {
                                  handleCompletionChange(
                                    quest.id,
                                    difficulty,
                                    e.target.checked
                                  );
                                }
                              }}
                              aria-label={`${quest.name} - ${DIFFICULTY_LABELS[difficulty]} completion`}
                              disabled={
                                currentQuestIsSaving || !isActuallyAvailable
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
