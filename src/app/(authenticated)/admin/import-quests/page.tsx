"use client";

import { useState, ChangeEvent } from "react";
import Papa from "papaparse";
import { AlertCircle, UploadCloud, ClipboardCopy, Loader2 } from "lucide-react";
import type { DDOQuest, Difficulty } from "@/config/ddoQuests";
import { useToast } from "@/hooks/use-toast";

const slugify = (text: string): string => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const ALL_POSSIBLE_DIFFICULTIES: Difficulty[] = [
  "casual",
  "normal",
  "hard",
  "elite",
];

export default function QuestImportPage() {
  const [fileName, setFileName] = useState<string>("");
  const [processedQuests, setProcessedQuests] = useState<DDOQuest[]>([]);
  const [typescriptOutput, setTypescriptOutput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setIsProcessing(true);
      setProcessedQuests([]);
      setTypescriptOutput("");
      Papa.parse(file, {
        complete: (result) => {
          const data = result.data as string[][];
          processCsvData(data);
          // console.log(`File Loaded: ${file.name} loaded and processed.`); // Debug
          setIsProcessing(false);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          toast({
            title: "CSV Parse Error",
            description: error.message,
            variant: "destructive",
          });
          setProcessedQuests([]);
          setTypescriptOutput("");
          setIsProcessing(false);
        },
      });
    }
  };

  const processCsvData = (dataToProcess: string[][]) => {
    if (dataToProcess.length <= 3) {
      toast({
        title: "No Data",
        description:
          "CSV file has insufficient data rows after skipping headers.",
        variant: "destructive",
      });
      setProcessedQuests([]);
      setTypescriptOutput("");
      return;
    }

    const questsData = dataToProcess.slice(3);
    const parsedQuests: DDOQuest[] = [];
    let skippedRowCount = 0;

    questsData.forEach((row, index) => {
      if (row.filter((cell) => cell && cell.trim() !== "").length === 0) {
        skippedRowCount++;
        return;
      }

      const questGiver = row[0]?.trim() || undefined;
      const name = row[2]?.trim();

      if (!name) {
        console.error(`Skipping row ${index + 4} due to missing quest name.`);
        skippedRowCount++;
        return;
      }

      if (name.toLowerCase().includes("test")) {
        // console.log(`Skipping row ${index + 4} (Quest: "${name}") because quest name contains "test".`); // Debug
        skippedRowCount++;
        return;
      }

      const pack = row[18]?.trim() || "Unknown Pack";

      const levelStr = row[4]?.trim();
      const level = levelStr ? parseInt(levelStr, 10) : 0;
      if (isNaN(level)) {
        console.error(
          `Skipping quest "${name}" due to invalid level: ${levelStr}`
        );
        skippedRowCount++;
        return;
      }

      const location = row[3]?.trim() || undefined;
      const favorArea = location;

      const raidStatusStr = row[27]?.trim().toLowerCase();
      const isRaid = raidStatusStr === "y" || raidStatusStr === "yes";

      const baseFavorStr = row[15]?.trim();
      let baseFavor = 0;
      if (baseFavorStr) {
        const match = baseFavorStr.match(/^(\d+)/);
        if (match && match[1]) {
          baseFavor = parseInt(match[1], 10);
        }
      }
      if (isNaN(baseFavor)) {
        console.error(
          `Invalid baseFavor for quest "${name}": ${baseFavorStr}. Defaulting to 0.`
        );
        baseFavor = 0;
      }

      const parseXp = (val: string | undefined): number | undefined => {
        if (val === undefined || val.trim() === "") return undefined;
        const num = parseInt(val.trim(), 10);
        return isNaN(num) ? undefined : num;
      };

      const xpCasual = parseXp(row[5]);
      const xpNormal = parseXp(row[6]);
      const xpHard = parseXp(row[7]);
      const xpElite = parseXp(row[8]);

      const questLengthStr = row[9]?.trim();
      let questLength: string | undefined = undefined;
      if (questLengthStr && questLengthStr.length > 2) {
        questLength = questLengthStr.substring(2);
      } else if (questLengthStr) {
        questLength = questLengthStr;
      }

      const questId = slugify(`${pack}-${name}`);

      const questToAdd: DDOQuest = {
        id: questId,
        name,
        level,
        pack,
        isRaid,
        baseFavor,
        location,
        favorArea,
        ...(questGiver !== undefined && { questGiver }),
        ...(xpCasual !== undefined && { xpCasual }),
        ...(xpNormal !== undefined && { xpNormal }),
        ...(xpHard !== undefined && { xpHard }),
        ...(xpElite !== undefined && { xpElite }),
        ...(questLength !== undefined && { questLength }),
      };

      const casualNotAvailable = row[20]?.trim().toLowerCase() === "true";
      const normalNotAvailable = row[21]?.trim().toLowerCase() === "true";
      const hardNotAvailable = row[22]?.trim().toLowerCase() === "true";
      const eliteNotAvailable = row[23]?.trim().toLowerCase() === "true";

      const specifiedAnyNonAvailability =
        row[20] !== undefined ||
        row[21] !== undefined ||
        row[22] !== undefined ||
        row[23] !== undefined;

      let currentAvailableDifficulties: Difficulty[] = [
        ...ALL_POSSIBLE_DIFFICULTIES,
      ];

      if (specifiedAnyNonAvailability) {
        if (casualNotAvailable)
          currentAvailableDifficulties = currentAvailableDifficulties.filter(
            (d) => d !== "casual"
          );
        if (normalNotAvailable)
          currentAvailableDifficulties = currentAvailableDifficulties.filter(
            (d) => d !== "normal"
          );
        if (hardNotAvailable)
          currentAvailableDifficulties = currentAvailableDifficulties.filter(
            (d) => d !== "hard"
          );
        if (eliteNotAvailable)
          currentAvailableDifficulties = currentAvailableDifficulties.filter(
            (d) => d !== "elite"
          );
      }

      const isDefaultAllAvailable =
        currentAvailableDifficulties.length ===
          ALL_POSSIBLE_DIFFICULTIES.length &&
        ALL_POSSIBLE_DIFFICULTIES.every((d) =>
          currentAvailableDifficulties.includes(d)
        );

      if (specifiedAnyNonAvailability || !isDefaultAllAvailable) {
        questToAdd.availableDifficulties = currentAvailableDifficulties;
      }

      parsedQuests.push(questToAdd);
    });

    setProcessedQuests(parsedQuests);
    if (parsedQuests.length > 0) {
      generateTypescriptOutput(parsedQuests);
      // console.log(`CSV Processed: ${parsedQuests.length} quests parsed. ${skippedRowCount} rows skipped. TypeScript code generated.`); // Debug
    } else {
      toast({
        title: "No Quests Processed",
        description: `No valid quests found in the CSV. ${skippedRowCount} rows skipped. Check file format and column mapping.`,
        variant: "destructive",
      });
      setTypescriptOutput("");
    }
  };

  const generateTypescriptOutput = (quests: DDOQuest[]) => {
    const outputString = `
// Generated on ${new Date().toISOString()}
// This is the FULL content for src/config/ddoQuests.ts
// Paste this entire content into that file, replacing its current content.
// It includes Difficulty type, DDOQuest interface, ALL_ADVENTURE_PACKS, and ALL_DDO_QUESTS.

export type Difficulty = 'casual' | 'normal' | 'hard' | 'elite';

export interface DDOQuest {
  id: string;
  name: string;
  level: number;
  pack: string;
  isRaid: boolean;
  baseFavor: number;
  location?: string;
  favorArea?: string;
  availableDifficulties?: Difficulty[];
  xpCasual?: number;
  xpNormal?: number;
  xpHard?: number;
  xpElite?: number;
  questLength?: string;
  questGiver?: string;
}

export const ALL_ADVENTURE_PACKS = [
  "Attack on Stormreach", "Fables of the Feywild", "Isle of Dread", "Masterminds of Sharn",
  "Menace of the Underdark", "Mists of Ravenloft", "Sentinels of Stormreach", "Sinister Secret of Saltmarsh",
  "The Catacombs", "The Devils of Shavarath", "The Haunted Halls of Eveningstar", "The High Road of Cormanthor",
  "The Lost Gatekeepers", "The Necropolis Part 1", "The Necropolis Part 2", "The Necropolis Part 3", "The Necropolis Part 4",
  "The Path of Inspiration", "The Phiarlan Carnival", "The Reaver's Reach", "The Red Fens",
  "The Restless Isles", "The Seal of Shan-To-Kor", "The Shadowfell Conspiracy", "The Sharn Syndicate",
  "The Tear of Dhakaan", "The Temple of Elemental Evil", "The Vale of Twilight", "Vault of Night",
  "Vecna Unleashed"
].sort((a, b) => a.localeCompare(b));

export const ALL_DDO_QUESTS: DDOQuest[] = ${JSON.stringify(quests, null, 2)};
`;
    setTypescriptOutput(outputString.trim());
  };

  const copyToClipboard = () => {
    if (!typescriptOutput) {
      toast({
        title: "Nothing to Copy",
        description: "No TypeScript code generated yet.",
        variant: "destructive",
      });
      return;
    }
    navigator.clipboard
      .writeText(typescriptOutput)
      .then(() => {
        toast({
          title: "Copied!",
          description: "TypeScript code copied to clipboard.",
        });
      })
      .catch((err) => {
        toast({
          title: "Copy Failed",
          description: "Could not copy to clipboard. See console.",
          variant: "destructive",
        });
        console.error("Failed to copy text: ", err);
      });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="rounded-lg border bg-card text-card-foreground shadow-xl">
        <div className="flex flex-col space-y-1.5 p-6">
          <h2 className="text-2xl font-semibold leading-none tracking-tight font-headline text-accent flex items-center">
            <UploadCloud className="mr-3 h-7 w-7" /> CSV to TypeScript Quest
            Array Generator
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload your DDO quest data CSV (from "Favor Tracker" tab). This tool
            will parse it and generate the TypeScript code for the
            `ALL_DDO_QUESTS` array. You can then copy this code and paste it
            into `src/config/ddoQuests.ts`.
          </p>
        </div>
        <div className="p-6 pt-0 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="csv-upload"
              className="text-base text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Upload CSV File
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-input/70 focus:bg-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              disabled={isProcessing}
            />
            {fileName && (
              <p className="text-sm text-muted-foreground">
                Selected file: {fileName}
              </p>
            )}
            {isProcessing && (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </div>
            )}
          </div>

          {processedQuests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                Parsed Quests Preview ({processedQuests.length})
              </h3>
              <div className="h-40 border rounded-md p-2 overflow-auto">
                <ul className="text-xs space-y-1">
                  {processedQuests.slice(0, 10).map((q) => (
                    <li key={q.id} className="truncate">
                      ID: {q.id}, Giver: {q.questGiver}, Name: {q.name}, Lvl:{" "}
                      {q.level}, Favor: {q.baseFavor}, CasualXP: {q.xpCasual},
                      EliteXP: {q.xpElite}, AvailDiff:{" "}
                      {q.availableDifficulties?.join(", ") || "All Default"},
                      Length: {q.questLength}
                    </li>
                  ))}
                  {processedQuests.length > 10 && (
                    <li>...and {processedQuests.length - 10} more.</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {typescriptOutput && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  Generated TypeScript Code (Full File Content)
                </h3>
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                >
                  <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Code
                </button>
              </div>
              <textarea
                readOnly
                value={typescriptOutput}
                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-code text-xs bg-muted/30"
                aria-label="Generated TypeScript code for DDO quests (full file content)"
              />
            </div>
          )}

          <div className="rounded-lg border bg-primary/5 border-primary/20 mt-6">
            <div className="flex flex-col space-y-1.5 p-6">
              <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-primary" />{" "}
                Instructions & Column Mapping
              </h3>
            </div>
            <div className="p-6 pt-0 text-sm space-y-2 text-foreground/80">
              <p>
                1. Ensure you are on the "Favor Tracker" tab in your Google
                Sheet.
              </p>
              <p>
                2. Go to `File &gt; Download &gt; Comma Separated Values
                (.csv)`.
              </p>
              <p>3. Upload the downloaded CSV file here.</p>
              <p>
                4. Click "Copy Code" and paste the entire content into
                `src/config/ddoQuests.ts`, replacing its existing content.
              </p>
              <p className="font-medium mt-2">
                Expected Columns (from "Favor Tracker" tab):
              </p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>
                  Quest Giver: Column <strong>A</strong> (index 0)
                </li>
                <li>
                  Quest Name: Column <strong>C</strong> (index 2) - Rows with
                  "test" in this column will be skipped.
                </li>
                <li>
                  Location: Column <strong>D</strong> (index 3)
                </li>
                <li>
                  Level: Column <strong>E</strong> (index 4)
                </li>
                <li>
                  Casual XP: Column <strong>F</strong> (index 5)
                </li>
                <li>
                  Normal XP: Column <strong>G</strong> (index 6)
                </li>
                <li>
                  Hard XP: Column <strong>H</strong> (index 7)
                </li>
                <li>
                  Elite XP: Column <strong>I</strong> (index 8)
                </li>
                <li>
                  Quest Length: Column <strong>J</strong> (index 9 - first 2
                  characters removed)
                </li>
                <li>
                  Base Favor: Column <strong>P</strong> (index 15 - first number
                  extracted)
                </li>
                <li>
                  Adventure Pack: Column <strong>S</strong> (index 18)
                </li>
                <li className="font-semibold">
                  Difficulty Unavailability (Case-insensitive "TRUE" means NOT
                  available):
                </li>
                <li>
                  &nbsp;&nbsp;&nbsp;&nbsp;Casual NOT Available: Column{" "}
                  <strong>U</strong> (index 20)
                </li>
                <li>
                  &nbsp;&nbsp;&nbsp;&nbsp;Normal NOT Available: Column{" "}
                  <strong>V</strong> (index 21)
                </li>
                <li>
                  &nbsp;&nbsp;&nbsp;&nbsp;Hard NOT Available: Column{" "}
                  <strong>W</strong> (index 22)
                </li>
                <li>
                  &nbsp;&nbsp;&nbsp;&nbsp;Elite NOT Available: Column{" "}
                  <strong>X</strong> (index 23)
                </li>
                <li>
                  Raid Status: Column <strong>AB</strong> (index 27 - "Y" for
                  yes)
                </li>
                <li>
                  If difficulty unavailability columns (U-X) are not present or
                  all are blank/not 'TRUE', the quest will default to all
                  difficulties being available.
                </li>
              </ul>
              <p className="mt-2">
                The tool will skip the first <strong>3 rows</strong> of the CSV,
                assuming they are headers. Empty rows will also be skipped.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
