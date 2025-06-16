"use server";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth as serverAuthAction } from "@/lib/firebase.server"; // Renamed auth import
import type { AccountData } from "@/types";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const UpdateOwnedPacksSchema = z.object({
  userId: z.string().min(1, { message: "User ID is required." }),
  ownedPacks: z.array(z.string()).default([]),
});

interface AccountFormState {
  message?: string | null;
  errors?: {
    ownedPacks?: string[];
    general?: string[];
  } | null;
  success?: boolean;
  updatedPacks?: string[];
}

export async function getOwnedPacksAction(userId: string): Promise<string[]> {
  console.log(
    `[Server Action getOwnedPacksAction] Initiated. UserID: ${userId}`
  ); // Debug
  const serverAuthCurrentUser = serverAuthAction?.currentUser; // Debug
  console.log(
    "[Server Action getOwnedPacksAction] serverAuthAction.currentUser:",
    serverAuthCurrentUser ? serverAuthCurrentUser.uid : "null"
  ); // Debug
  if (!userId) {
    console.error(
      "[Server Action getOwnedPacksAction] User ID is required. Returning empty array."
    );
    return [];
  }
  try {
    if (!db) {
      const dbErrorMsg =
        "[Server Action getOwnedPacksAction] CRITICAL: Firestore service (db) not available on server.";
      console.error(dbErrorMsg);
      throw new Error(dbErrorMsg);
    }
    const accountDocRef = doc(db, "accounts", userId);
    const docSnap = await getDoc(accountDocRef);

    if (docSnap.exists()) {
      const accountData = docSnap.data() as AccountData;
      console.log(
        `[Server Action getOwnedPacksAction] Found account data for UserID: ${userId}. Packs:`,
        accountData.ownedAdventurePacks
      ); // Debug
      return accountData.ownedAdventurePacks || [];
    } else {
      console.log(
        `[Server Action getOwnedPacksAction] No account data found for UserID: ${userId}. Returning empty array.`
      ); // Debug
      return [];
    }
  } catch (error: any) {
    console.error(
      "[Server Action getOwnedPacksAction] Catch Block - Error fetching owned packs:",
      error.message,
      error.stack
    );
    return [];
  }
}

export async function updateOwnedPacksAction(
  prevState: AccountFormState | null,
  formData: FormData
): Promise<AccountFormState> {
  console.log(
    "[Server Action updateOwnedPacksAction] Initiated. FormData (raw):",
    formData.get("ownedPacksJson")
  ); // Debug
  const serverAuthCurrentUser = serverAuthAction?.currentUser; // Debug
  console.log(
    "[Server Action updateOwnedPacksAction] serverAuthAction.currentUser:",
    serverAuthCurrentUser ? serverAuthCurrentUser.uid : "null"
  ); // Debug

  const ownedPacksStr = formData.get("ownedPacksJson");
  let ownedPacksArray: string[] = [];
  if (typeof ownedPacksStr === "string") {
    try {
      ownedPacksArray = JSON.parse(ownedPacksStr);
      if (
        !Array.isArray(ownedPacksArray) ||
        !ownedPacksArray.every((item) => typeof item === "string")
      ) {
        throw new Error("Parsed ownedPacksJson is not an array of strings.");
      }
    } catch (e: any) {
      console.error(
        "[Server Action updateOwnedPacksAction] Error parsing ownedPacksJson:",
        e.message
      );
      return {
        message: "Invalid format for owned packs data.",
        errors: { general: ["Invalid format for owned packs data."] },
        success: false,
      };
    }
  } else {
    console.warn(
      "[Server Action updateOwnedPacksAction] ownedPacksJson not provided or not a string. Assuming empty array."
    );
  }

  const validatedFields = UpdateOwnedPacksSchema.safeParse({
    userId: formData.get("userId"),
    ownedPacks: ownedPacksArray,
  });

  if (!validatedFields.success) {
    console.error(
      "[Server Action updateOwnedPacksAction] Validation failed:",
      validatedFields.error.flatten().fieldErrors
    );
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid data for updating owned packs.",
      success: false,
    };
  }

  const { userId, ownedPacks } = validatedFields.data;
  console.log(
    `[Server Action updateOwnedPacksAction] Validated data - UserID: ${userId}, Packs:`,
    ownedPacks
  ); // Debug

  try {
    if (!db) {
      const dbErrorMsg =
        "[Server Action updateOwnedPacksAction] CRITICAL: Firestore service (db) not available on server.";
      console.error(dbErrorMsg);
      throw new Error(dbErrorMsg);
    }
    const accountDocRef = doc(db, "accounts", userId);

    await setDoc(
      accountDocRef,
      {
        id: userId,
        ownedAdventurePacks: ownedPacks,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `[Server Action updateOwnedPacksAction] Owned packs updated successfully in Firestore for UserID: ${userId}`
    ); // Debug

    revalidatePath("/account");
    console.log(
      "[Server Action updateOwnedPacksAction] Path /account revalidated."
    ); // Debug

    return {
      message: "Owned adventure packs updated successfully!",
      success: true,
      updatedPacks: ownedPacks,
    };
  } catch (error: any) {
    console.error(
      "[Server Action updateOwnedPacksAction] Catch Block - Error updating owned packs:",
      error.message,
      error.stack
    );
    return {
      message: `Failed to update owned packs. Server error: ${error.message}`,
      success: false,
      errors: {
        general: [error.message || "Server error during packs update."],
      },
    };
  }
}
