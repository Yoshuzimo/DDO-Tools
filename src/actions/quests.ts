export interface DDOQuest {
  id: string;
  name: string;
  level: number;
  pack: string;
  isRaid: boolean;
  baseFavor: number;
  location?: string;
  favorArea?: string;
}

// This list is for UI filtering of owned packs on the Account page.
// Please ensure this list is accurate and complete based on your "Packs" tab from the spreadsheet.
// It should be sorted alphabetically.
export const ALL_ADVENTURE_PACKS = [
  "Attack on Stormreach",
  "Fables of the Feywild",
  "Isle of Dread",
  "Masterminds of Sharn",
  "Menace of the Underdark",
  "Mists of Ravenloft",
  "Sentinels of Stormreach",
  "Sinister Secret of Saltmarsh",
  "The Catacombs",
  "The Devils of Shavarath",
  "The Haunted Halls of Eveningstar",
  "The High Road of Cormanthor",
  "The Lost Gatekeepers",
  "The Necropolis Part 1",
  "The Necropolis Part 2",
  "The Necropolis Part 3",
  "The Necropolis Part 4",
  "The Path of Inspiration",
  "The Phiarlan Carnival",
  "The Reaver's Reach",
  "The Red Fens",
  "The Restless Isles",
  "The Seal of Shan-To-Kor",
  "The Shadowfell Conspiracy",
  "The Sharn Syndicate",
  "The Tear of Dhakaan",
  "The Temple of Elemental Evil",
  "The Vale of Twilight",
  "Vault of Night",
  "Vecna Unleashed",
].sort((a, b) => a.localeCompare(b));

// The ALL_DDO_QUESTS array is the source of quest data for the application.
// It should be updated by copying the output from the CSV import tool
// at /admin/import-quests and pasting it here, replacing this comment and the empty array below.
export const ALL_DDO_QUESTS: DDOQuest[] = [
  // Example of how quest data should look.
  // Replace this with the output from the /admin/import-quests tool.
  /*
  {
    id: "free-to-play-the-kobolds-new-ringleader",
    name: "The Kobold's New Ringleader",
    level: 2,
    pack: "Free to Play",
    isRaid: false,
    baseFavor: 6,
    location: "The Harbor",
    favorArea: "The Harbor"
  },
  {
    id: "free-to-play-stopping-the-sahuagin",
    name: "Stopping the Sahuagin",
    level: 2,
    pack: "Free to Play",
    isRaid: false,
    baseFavor: 6,
    location: "The Harbor",
    favorArea: "The Harbor"
  }
  */
];
