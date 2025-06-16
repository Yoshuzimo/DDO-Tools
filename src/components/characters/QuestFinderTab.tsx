"use client";

import type { Character } from "@/types";
import { DDOQuest, ALL_DDO_QUESTS } from "@/config/ddoQuests";
import { useState, useMemo } from "react";
import { Search, BookOpen, ShieldAlert, ShieldCheck } from "lucide-react";

interface QuestFinderTabProps {
  character: Character;
  ownedPacks: string[];
  isLoadingPacks: boolean;
}

const normalizeQuestNameForSort = (name: string | undefined): string => {
  if (!name) return "";
  const trimmedName = name.trim();
  if (trimmedName.toLowerCase().startsWith("the ")) {
    return trimmedName.substring(4);
  }
  return trimmedName;
};

export const QuestFinderTab = ({
  character,
  ownedPacks,
  isLoadingPacks,
}: QuestFinderTabProps) => {
  const [showRaids, setShowRaids] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredQuests = useMemo(() => {
    return ALL_DDO_QUESTS.filter((quest) => {
      const packOwned =
        quest.pack === "Free to Play" || ownedPacks.includes(quest.pack);
      if (!packOwned) return false;

      const levelMatch = quest.level <= character.level;
      if (!levelMatch) return false;

      if (!showRaids && quest.isRaid) return false;

      if (
        searchTerm &&
        !quest.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;

      return true;
    }).sort((a, b) => {
      if (a.level < b.level) return -1;
      if (a.level > b.level) return 1;
      // Apply normalization for name comparison
      return normalizeQuestNameForSort(a.name)
        .toLowerCase()
        .localeCompare(normalizeQuestNameForSort(b.name).toLowerCase());
    });
  }, [character.level, ownedPacks, showRaids, searchTerm]);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-lg">
      <div className="flex flex-col space-y-1.5 p-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight font-headline text-accent flex items-center">
          <BookOpen className="mr-3 h-7 w-7" /> Quest Finder
        </h2>
        <p className="text-sm text-muted-foreground">
          Available quests based on your level ({character.level}) and owned
          adventure packs.
          {isLoadingPacks && " (Loading pack data...)"}
        </p>
      </div>
      <div className="p-6 pt-0 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search quests by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-input/70 focus:bg-input"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showRaidsQuestFinder" // Unique ID
              checked={showRaids}
              onChange={(e) => setShowRaids(e.target.checked)}
              className="form-checkbox h-4 w-4 text-primary focus:ring-accent border-input rounded"
            />
            <label
              htmlFor="showRaidsQuestFinder"
              className="cursor-pointer select-none text-sm font-medium leading-none"
            >
              Show Raids
            </label>
          </div>
        </div>

        <div className="h-[500px] border rounded-md overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 bg-card z-10 [&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[50%]">
                  Quest Name
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground w-[15%]">
                  Level
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[30%]">
                  Pack
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground w-[5%]">
                  Raid
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {isLoadingPacks && (
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <td
                    colSpan={4}
                    className="p-4 align-middle text-center text-muted-foreground py-8"
                  >
                    Loading quest availability...
                  </td>
                </tr>
              )}
              {!isLoadingPacks && filteredQuests.length === 0 && (
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <td
                    colSpan={4}
                    className="p-4 align-middle text-center text-muted-foreground py-8"
                  >
                    No quests match your current filters and level.
                  </td>
                </tr>
              )}
              {!isLoadingPacks &&
                filteredQuests.map((quest) => (
                  <tr
                    key={quest.id}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4 align-middle font-medium py-2.5">
                      {quest.name}
                    </td>
                    <td className="p-4 align-middle text-center py-2.5">
                      {quest.level}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground py-2.5">
                      {quest.pack}
                    </td>
                    <td className="p-4 align-middle text-center py-2.5">
                      {quest.isRaid ? (
                        <ShieldAlert
                          className="h-5 w-5 text-destructive inline-block"
                          title="Raid"
                        />
                      ) : (
                        <ShieldCheck
                          className="h-5 w-5 text-green-400 inline-block"
                          title="Standard Quest"
                        />
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
