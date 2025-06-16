
'use server';

import { collection, addDoc, serverTimestamp, query, getDocs, doc, getDoc, updateDoc, deleteDoc, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db, storage, auth as serverAuthAction } from '@/lib/firebase.server'; // Corrected import
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { z } from 'zod';
import type { Character, CharacterSortOption, FactionFavor, QuestCompletionStatus as QuestCompletionStatusType, DurationWeights, CharacterUiPreferences, DurationType } from '@/types';
import { DURATION_TYPES_CONST, DEFAULT_UI_PREFERENCES } from '@/types';
import { revalidatePath } from 'next/cache';

const CharacterCreateSchema = z.object({
  name: z.string().min(2, { message: "Character name must be at least 2 characters." }).max(50, { message: "Character name too long."}),
  level: z.coerce.number().min(1, { message: "Level must be at least 1." }).max(40, { message: "Level cannot exceed 40."}),
  userId: z.string().min(1, { message: "User ID is required." }),
});

const UpdateCharacterNameSchema = z.object({
  userId: z.string().min(1, { message: "User ID is required." }),
  characterId: z.string().min(1, { message: "Character ID is required." }),
  name: z.string().min(2, { message: "Character name must be at least 2 characters." }).max(50, { message: "Character name too long."}),
});

const UpdateCharacterLevelSchema = z.object({
  userId: z.string().min(1, { message: "User ID is required." }),
  characterId: z.string().min(1, { message: "Character ID is required." }),
  level: z.coerce.number().min(1, { message: "Level must be at least 1." }).max(40, { message: "Level cannot exceed 40."}),
});

const CharacterImageUpdateSchema = z.object({
  userId: z.string().min(1, { message: "User ID is required." }),
  characterId: z.string().min(1, { message: "Character ID is required." }),
  imageDataUri: z.string().startsWith('data:image/', { message: "Invalid image data URI." }),
});

const FactionFavorSchema = z.object({
  currentFavor: z.coerce.number().min(0, "Favor cannot be negative."),
});

const UpdateCharacterFavorDetailsSchema = z.object({
  userId: z.string().min(1, { message: "User ID is required." }),
  characterId: z.string().min(1, { message: "Character ID is required." }),
  favorDetails: z.record(FactionFavorSchema),
});

const QuestCompletionStatusSchema = z.object({
  casual: z.boolean(),
  normal: z.boolean(),
  hard: z.boolean(),
  elite: z.boolean(),
});

const SaveSingleQuestCompletionSchema = z.object({
  userId: z.string().min(1),
  characterId: z.string().min(1),
  questId: z.string().min(1),
  status: QuestCompletionStatusSchema,
});

const ResetAllQuestCompletionsSchema = z.object({
  userId: z.string().min(1),
  characterId: z.string().min(1),
});

const DurationWeightsSchema = z.object({
  "Very Short": z.number(),
  "Short": z.number(),
  "Medium": z.number(),
  "Long": z.number(),
  "Very Long": z.number(),
}) satisfies z.ZodType<DurationWeights>;


const CharacterUiPreferencesSchema = z.object({
  durationWeights: DurationWeightsSchema.optional(),
  showRaids: z.boolean().optional(),
  onCormyrFilter: z.boolean().optional(),
  showCompletedQuestsFavorTracker: z.boolean().optional(),
}) satisfies z.ZodType<CharacterUiPreferences>;

const UpdateCharacterUiPreferencesSchema = z.object({
  userId: z.string().min(1),
  characterId: z.string().min(1),
  preferences: CharacterUiPreferencesSchema,
});

const QuestCompletionUpdateSchema = z.object({
  questId: z.string().min(1),
  status: QuestCompletionStatusSchema,
});

const BatchUpdateQuestCompletionsSchema = z.object({
  userId: z.string().min(1),
  characterId: z.string().min(1),
  updates: z.array(QuestCompletionUpdateSchema),
});


interface CharacterFormState {
  message?: string | null;
  errors?: {
    name?: string[];
    level?: string[];
    userId?: string[];
    characterId?: string[];
    imageDataUri?: string[];
    favorDetails?: string[];
    questCompletionStatus?: string[];
    preferences?: string[];
    general?: string[];
  } | null;
  characterId?: string | null;
  success?: boolean;
  updatedLevel?: number;
  updatedImageUrl?: string;
  updatedFavorDetails?: Record<string, FactionFavor>;
  updatedUiPreferences?: CharacterUiPreferences;
  updatedName?: string;
}


export async function createCharacter(prevState: CharacterFormState | null, formData: FormData): Promise<CharacterFormState> {
  console.log('[Server Action createCharacter] Initiated.');
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action createCharacter] serverAuthAction.currentUser (from firebase.server.ts):', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  const validatedFields = CharacterCreateSchema.safeParse({
    name: formData.get('name'),
    level: formData.get('level'),
    userId: formData.get('userId'),
  });

  if (!validatedFields.success) {
    console.error('[Server Action createCharacter] Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid character data.',
      success: false,
    };
  }

  const { name, level, userId } = validatedFields.data;
  console.log(`[Server Action createCharacter] Validated data - UserID (from form): ${userId}, Name: ${name}, Level: ${level}`);

  try {
    if (!db) {
        const dbErrorMsg = "[Server Action createCharacter] CRITICAL: Firestore service (db) not available on server.";
        console.error(dbErrorMsg);
        throw new Error(dbErrorMsg);
    }
    const charactersCollectionRef = collection(db, 'users', userId, 'characters');
    const newCharDocRef = await addDoc(charactersCollectionRef, {
      userId,
      name,
      level,
      imageUrl: null,
      favorDetails: {},
      questCompletionStatus: {},
      uiPreferences: DEFAULT_UI_PREFERENCES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`[Server Action createCharacter] Character created successfully in Firestore with ID: ${newCharDocRef.id}`);
    revalidatePath('/dashboard');
    revalidatePath(`/characters/${newCharDocRef.id}`);

    return { message: "Character created successfully!", characterId: newCharDocRef.id, success: true };
  } catch (error: any) {
    console.error("[Server Action createCharacter] Catch Block - Error creating character:", error.message, error.stack);
    return { message: `Failed to create character. Server error: ${error.message}`, success: false, errors: { general: [`Server error during character creation: ${error.message}`] } };
  }
}

export async function updateCharacterNameAction(prevState: CharacterFormState | null, formData: FormData): Promise<CharacterFormState> {
  console.log('[Server Action updateCharacterNameAction] ACTION CALLED.');
  const serverAuthInstanceUser = serverAuthAction?.currentUser;
  console.log('[Server Action updateCharacterNameAction] Server_Auth_Instance_User_State (serverAuthAction.currentUser):', serverAuthInstanceUser ? serverAuthInstanceUser.uid : 'null');

  const userIdFromForm = formData.get('userId') as string;
  const characterIdFromForm = formData.get('characterId') as string;
  const newNameFromForm = formData.get('name') as string;

  console.log(`[Server Action updateCharacterNameAction] Data from form: UserID='${userIdFromForm}', CharID='${characterIdFromForm}', NewName='${newNameFromForm}'`);
  console.log(`[Server Action updateCharacterNameAction] IMPORTANT: Firestore 'updateDoc' will use UserID_from_Form ('${userIdFromForm}') and CharID_from_Form ('${characterIdFromForm}') for the document path.`);

  const validatedFields = UpdateCharacterNameSchema.safeParse({
    userId: userIdFromForm,
    characterId: characterIdFromForm,
    name: newNameFromForm,
  });

  if (!validatedFields.success) {
    console.error('[Server Action updateCharacterNameAction] Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data for name update.',
      success: false,
    };
  }

  const { userId, characterId, name } = validatedFields.data;
  console.log(`[Server Action updateCharacterNameAction] Validated data - UserID: ${userId}, CharID: ${characterId}, New Name: ${name}`);

  try {
    if (!db) {
        const dbErrorMsg = "[Server Action updateCharacterNameAction] CRITICAL: Firestore service (db) not available on server.";
        console.error(dbErrorMsg);
        throw new Error(dbErrorMsg);
    }
    const charDocRef = doc(db, 'users', userId, 'characters', characterId);

    await updateDoc(charDocRef, {
      name: name,
      updatedAt: serverTimestamp(),
    });
    console.log(`[Server Action updateCharacterNameAction] Name updated successfully for ${characterId}.`);

    revalidatePath(`/characters/${characterId}`);
    revalidatePath(`/characters/${characterId}/edit-name`);
    revalidatePath('/dashboard');

    return { message: `Name updated to "${name}" successfully!`, success: true, updatedName: name };

  } catch (error: any) {
    console.error("[Server Action updateCharacterNameAction] Catch Block - Error updating character name:", error.message, error.stack);
    let errorMessage = `Failed to update character name. Server error: ${error.message}`;
    if (error.message && error.message.includes('No document to update')) {
        errorMessage = 'Character not found in Firestore. Could not update name.';
    }
    return {
        message: errorMessage,
        success: false,
        errors: { general: [error.message || 'Server error during name update.'] }
    };
  }
}


export async function updateCharacterUiPreferencesAction(
  userId: string,
  characterId: string,
  preferences: CharacterUiPreferences
): Promise<{ success: boolean; message: string; updatedPreferences?: CharacterUiPreferences; errors?: any }> {
  console.log(`[Server Action updateCharacterUiPreferencesAction] UserID: ${userId}, CharID: ${characterId}, Prefs:`, preferences);
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action updateCharacterUiPreferencesAction] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  const validated = UpdateCharacterUiPreferencesSchema.safeParse({ userId, characterId, preferences });

  if (!validated.success) {
    console.error("[Server Action updateCharacterUiPreferencesAction] Validation failed:", validated.error.flatten().fieldErrors);
    return { success: false, message: "Invalid UI preferences data.", errors: validated.error.flatten().fieldErrors };
  }
  try {
    if (!db) throw new Error("Firestore service not available.");
    const charDocRef = doc(db, 'users', userId, 'characters', characterId);
    await updateDoc(charDocRef, {
      uiPreferences: preferences,
      updatedAt: serverTimestamp(),
    });
    console.log(`[Server Action updateCharacterUiPreferencesAction] UI Preferences updated for ${characterId}`);
    return { success: true, message: "UI preferences updated.", updatedPreferences: preferences };
  } catch (error: any) {
    console.error("[Server Action updateCharacterUiPreferencesAction] Error:", error.message, error.stack);
    return { success: false, message: `Failed to update UI preferences: ${error.message}` };
  }
}


export async function updateCharacterLevel(prevState: CharacterFormState | null, formData: FormData): Promise<CharacterFormState> {
  console.log('[Server Action updateCharacterLevel] Initiated.');
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action updateCharacterLevel] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  const validatedFields = UpdateCharacterLevelSchema.safeParse({
    userId: formData.get('userId'),
    characterId: formData.get('characterId'),
    level: formData.get('level'),
  });

  if (!validatedFields.success) {
    console.error('[Server Action updateCharacterLevel] Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data for level update.',
      success: false,
    };
  }

  const { userId, characterId, level } = validatedFields.data;
  console.log(`[Server Action updateCharacterLevel] Validated data - UserID: ${userId}, CharID: ${characterId}, New Level: ${level}`);

  try {
    if (!db) {
        const dbErrorMsg = "[Server Action updateCharacterLevel] CRITICAL: Firestore service (db) not available on server.";
        console.error(dbErrorMsg);
        throw new Error(dbErrorMsg);
    }
    const charDocRef = doc(db, 'users', userId, 'characters', characterId);

    await updateDoc(charDocRef, {
      level: level,
      updatedAt: serverTimestamp(),
    });
    console.log(`[Server Action updateCharacterLevel] Level updated successfully for ${characterId}.`);

    revalidatePath(`/characters/${characterId}`);
    revalidatePath('/dashboard');

    return { message: `Level updated to ${level} successfully!`, success: true, updatedLevel: level };

  } catch (error: any) {
    console.error("[Server Action updateCharacterLevel] Catch Block - Error updating character level:", error.message, error.stack);
    let errorMessage = `Failed to update character level. Server error: ${error.message}`;
    if (error.message && error.message.includes('No document to update')) {
        errorMessage = 'Character not found in Firestore. Could not update level.';
    }
    return {
        message: errorMessage,
        success: false,
        errors: { general: [error.message || 'Server error during level update.'] }
    };
  }
}

export async function updateCharacterImage(prevState: CharacterFormState | null, formData: FormData): Promise<CharacterFormState> {
  console.log('[Server Action updateCharacterImage] Initiated.');
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action updateCharacterImage] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  const validatedFields = CharacterImageUpdateSchema.safeParse({
    userId: formData.get('userId'),
    characterId: formData.get('characterId'),
    imageDataUri: formData.get('imageDataUri'),
  });

  if (!validatedFields.success) {
    console.error('[Server Action updateCharacterImage] Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid image data for update.',
      success: false,
    };
  }

  const { userId, characterId, imageDataUri } = validatedFields.data;
  console.log(`[Server Action updateCharacterImage] Validated data - UserID: ${userId}, CharID: ${characterId}`);

  try {
    if (!db || !storage) {
        const serviceErrorMsg = "[Server Action updateCharacterImage] CRITICAL: Firestore (db) or Storage service not available on server.";
        console.error(serviceErrorMsg);
        throw new Error(serviceErrorMsg);
    }

    const imagePath = `users/${userId}/characters/${characterId}/profileImage.png`;
    const imageStorageRef = storageRef(storage, imagePath);

    const uploadResult = await uploadString(imageStorageRef, imageDataUri, 'data_url');
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log(`[Server Action updateCharacterImage] Image uploaded successfully to ${downloadURL}.`);

    const charDocRef = doc(db, 'users', userId, 'characters', characterId);
    await updateDoc(charDocRef, {
      imageUrl: downloadURL,
      updatedAt: serverTimestamp(),
    });
    console.log(`[Server Action updateCharacterImage] Firestore updated with new image URL for ${characterId}.`);

    return { message: 'Character image updated successfully!', success: true, updatedImageUrl: downloadURL };

  } catch (error: any) {
    console.error("[Server Action updateCharacterImage] Catch Block - Error updating character image:", error.message, error.stack);
    return {
        message: `Failed to update character image. Server error: ${error.message}`,
        success: false,
        errors: { general: [error.message || 'Server error during image update.'] }
    };
  }
}

export async function updateCharacterFavorDetails(prevState: CharacterFormState | null, formData: FormData): Promise<CharacterFormState> {
  console.log('[Server Action updateCharacterFavorDetails] Initiated.');
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action updateCharacterFavorDetails] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  const userId = formData.get('userId') as string;
  const characterId = formData.get('characterId') as string;
  const favorDetailsString = formData.get('favorDetailsJson') as string;

  let favorDetailsData: Record<string, FactionFavor> = {};
  try {
    if (favorDetailsString) {
      favorDetailsData = JSON.parse(favorDetailsString);
    } else {
       console.error('[Server Action updateCharacterFavorDetails] Favor details data is missing.');
       return {
        message: 'Favor details data is missing.',
        success: false,
        errors: { general: ['Favor details data is missing.'] }
      };
    }
  } catch (e: any) {
    console.error('[Server Action updateCharacterFavorDetails] Invalid format for favor details data:', e.message);
    return {
      message: 'Invalid format for favor details data.',
      success: false,
      errors: { general: ['Invalid format for favor details data.'] }
    };
  }

  const validatedFields = UpdateCharacterFavorDetailsSchema.safeParse({
    userId,
    characterId,
    favorDetails: favorDetailsData,
  });

  if (!validatedFields.success) {
    console.error('[Server Action updateCharacterFavorDetails] Validation failed:', validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid favor data submitted.',
      success: false,
    };
  }

  const { userId: validatedUserId, characterId: validatedCharacterId, favorDetails: validatedFavorDetails } = validatedFields.data;
  console.log(`[Server Action updateCharacterFavorDetails] Validated data - UserID: ${validatedUserId}, CharID: ${validatedCharacterId}`);

  try {
    if (!db) {
      const dbErrorMsg = "[Server Action updateCharacterFavorDetails] CRITICAL: Firestore service (db) not available on server.";
      console.error(dbErrorMsg);
      throw new Error(dbErrorMsg);
    }
    const charDocRef = doc(db, 'users', validatedUserId, 'characters', validatedCharacterId);

    await updateDoc(charDocRef, {
      favorDetails: validatedFavorDetails,
      updatedAt: serverTimestamp(),
    });
    console.log(`[Server Action updateCharacterFavorDetails] Favor details updated successfully for ${validatedCharacterId}.`);

    revalidatePath(`/characters/${validatedCharacterId}`);
    revalidatePath('/dashboard');

    return { message: `Favor details updated successfully!`, success: true, updatedFavorDetails: validatedFavorDetails };

  } catch (error: any) {
    console.error("[Server Action updateCharacterFavorDetails] Catch Block - Error updating favor details:", error.message, error.stack);
    return {
        message: `Failed to update favor details. Server error: ${error.message}`,
        success: false,
        errors: { general: [error.message || 'Server error during favor update.'] }
    };
  }
}

export async function saveSingleQuestCompletionAction(
  userId: string,
  characterId: string,
  questId: string,
  status: QuestCompletionStatusType
): Promise<{ success: boolean; message: string }> {
  console.log(`[Server Action saveSingleQuestCompletionAction] UserID: ${userId}, CharID: ${characterId}, QuestID: ${questId}`);
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action saveSingleQuestCompletionAction] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  const validated = SaveSingleQuestCompletionSchema.safeParse({ userId, characterId, questId, status });
  if (!validated.success) {
    console.error("[Server Action saveSingleQuestCompletionAction] Validation failed:", validated.error.flatten().fieldErrors);
    return { success: false, message: "Invalid quest completion data." };
  }
  try {
    if (!db) throw new Error("Firestore service not available.");
    const charDocRef = doc(db, 'users', userId, 'characters', characterId);
    await updateDoc(charDocRef, {
      [`questCompletionStatus.${questId}`]: status,
      updatedAt: serverTimestamp(),
    });
    console.log(`[Server Action saveSingleQuestCompletionAction] Quest completion updated for ${questId} on char ${characterId}.`);
    return { success: true, message: "Quest completion updated." };
  } catch (error: any) {
    console.error("[Server Action saveSingleQuestCompletionAction] Error:", error.message, error.stack);
    return { success: false, message: `Failed to update quest completion: ${error.message}` };
  }
}

export async function resetAllQuestCompletionsAction(
  userId: string,
  characterId: string
): Promise<{ success: boolean; message: string }> {
  console.log(`[Server Action resetAllQuestCompletionsAction] UserID: ${userId}, CharID: ${characterId}`);
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action resetAllQuestCompletionsAction] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  const validated = ResetAllQuestCompletionsSchema.safeParse({ userId, characterId });
  if (!validated.success) {
    console.error("[Server Action resetAllQuestCompletionsAction] Validation failed.");
    return { success: false, message: "Invalid data for resetting quest completions." };
  }
  try {
    if (!db) throw new Error("Firestore service not available.");
    const charDocRef = doc(db, 'users', userId, 'characters', characterId);
    await updateDoc(charDocRef, {
      questCompletionStatus: {},
      updatedAt: serverTimestamp(),
    });
    console.log(`[Server Action resetAllQuestCompletionsAction] All quest completions reset for char ${characterId}.`);
    return { success: true, message: "All quest completions have been reset." };
  } catch (error: any) {
    console.error("[Server Action resetAllQuestCompletionsAction] Error:", error.message, error.stack);
    return { success: false, message: `Failed to reset quest completions: ${error.message}` };
  }
}

export async function batchUpdateQuestCompletionsAction(
  userId: string,
  characterId: string,
  updates: Array<{ questId: string; status: QuestCompletionStatusType }>
): Promise<{ success: boolean; message: string; errors?: any }> {
  console.log(`[Server Action batchUpdateQuestCompletionsAction] UserID: ${userId}, CharID: ${characterId}, Updates Count: ${updates.length}`);
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action batchUpdateQuestCompletionsAction] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  const validated = BatchUpdateQuestCompletionsSchema.safeParse({ userId, characterId, updates });

  if (!validated.success) {
    console.error("[Server Action batchUpdateQuestCompletionsAction] Validation failed:", validated.error.flatten().fieldErrors);
    return { success: false, message: "Invalid data for batch quest completion update.", errors: validated.error.flatten().fieldErrors };
  }

  try {
    if (!db) throw new Error("Firestore service not available.");
    const charDocRef = doc(db, 'users', userId, 'characters', characterId);

    const firestoreUpdates: Record<string, any> = {};
    for (const update of validated.data.updates) {
      firestoreUpdates[`questCompletionStatus.${update.questId}`] = update.status;
    }
    firestoreUpdates['updatedAt'] = serverTimestamp();

    await updateDoc(charDocRef, firestoreUpdates);
    console.log(`[Server Action batchUpdateQuestCompletionsAction] Batch quest completions imported for char ${characterId}.`);

    revalidatePath(`/characters/${characterId}`);
    revalidatePath('/dashboard');

    return { success: true, message: `${updates.length} quest completions imported successfully.` };
  } catch (error: any) {
    console.error("[Server Action batchUpdateQuestCompletionsAction] Error:", error.message, error.stack);
    return { success: false, message: `Failed to import quest completions: ${error.message}` };
  }
}


export async function getCharacters(userId: string, sortOption?: CharacterSortOption): Promise<Character[]> {
  console.log(`[Server Action getCharacters] UserID: ${userId}, Sort:`, sortOption);
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action getCharacters] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  if (!userId) {
    console.warn("[Server Action getCharacters] User ID is required but not provided. Returning empty array.");
    return [];
  }
  if (userId === "server_fetch_requires_actual_user_id") {
      console.warn("[Server Action getCharacters] Placeholder User ID received. Returning empty array.");
      return [];
  }
  try {
    if (!db) {
        console.error("[Server Action getCharacters] Firestore service (db) not available. Returning empty array.");
        return [];
    }
    const charactersCollectionRef = collection(db, 'users', userId, 'characters');

    let q = query(charactersCollectionRef);
    if (sortOption) {
      q = query(q, firestoreOrderBy(sortOption.field, sortOption.direction));
    } else {
      q = query(q, firestoreOrderBy('createdAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    console.log(`[Server Action getCharacters] Fetched ${querySnapshot.docs.length} characters from Firestore for UserID: ${userId}.`);
    const characters = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        name: data.name,
        level: data.level,
        imageUrl: data.imageUrl || null,
        favorDetails: data.favorDetails || {},
        questCompletionStatus: data.questCompletionStatus || {},
        uiPreferences: { ...DEFAULT_UI_PREFERENCES, ...(data.uiPreferences || {}) },
        class: data.class || undefined,
        tokens: data.tokens || {},
        equipment: data.equipment || {},
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
      } as Character;
    });
    return characters;
  } catch (error: any) {
    console.error("[Server Action getCharacters] Catch Block - Error fetching characters:", error.message, error.stack);
    return [];
  }
}

export async function getCharacterById(userId: string, characterId: string): Promise<Character | null> {
  // Log the parameters received from the client
  console.log(`[Server Action getCharacterById] ACTION CALLED. UserID (from client param): '${userId}', CharacterID (from client param): '${characterId}'`);

  // Log the state of the server's own auth instance (this is for debugging the server's context, NOT for data fetching path)
  const serverAuthInstanceUser = serverAuthAction?.currentUser;
  console.log(`[Server Action getCharacterById] Server_Auth_Instance_User_State (serverAuthAction.currentUser): ${serverAuthInstanceUser ? `'${serverAuthInstanceUser.uid}'` : 'null'}`);
  console.log(`[Server Action getCharacterById] IMPORTANT: The Firestore query below will use the 'userId' PARAMETER ('${userId}') to construct the document path.`);

  if (!userId || !characterId) {
    console.warn("[Server Action getCharacterById] Validation: User ID or Character ID parameter is missing. Returning null.");
    return null;
  }
  try {
    if (!db) {
        console.error("[Server Action getCharacterById] CRITICAL: Firestore service (db from firebase.server.ts) not available. Returning null.");
        return null;
    }
    const docPath = `users/${userId}/characters/${characterId}`;
    console.log(`[Server Action getCharacterById] Attempting to fetch document from Firestore at path: ${docPath}`);
    const charDocRef = doc(db, docPath); // Path uses the userId parameter
    const docSnap = await getDoc(charDocRef);

    if (docSnap.exists()) {
      console.log(`[Server Action getCharacterById] SUCCESS: Character found at path ${docPath}.`);
      const data = docSnap.data();
      // Verify that the userId in the document matches the userId parameter for integrity, if needed.
      if (data.userId !== userId) {
          console.error(`[Server Action getCharacterById] MISMATCH: UserID in fetched document ('${data.userId}') does not match requested UserID ('${userId}'). This indicates a potential data access issue or incorrect characterId for the user.`);
          // Depending on policy, you might return null here as if not found for this user.
          // For now, returning data but logging error. Consider this if strict ownership is paramount for this function.
      }
      return {
        id: docSnap.id,
        userId: data.userId,
        name: data.name,
        level: data.level,
        imageUrl: data.imageUrl || null,
        favorDetails: data.favorDetails || {},
        questCompletionStatus: data.questCompletionStatus || {},
        uiPreferences: { ...DEFAULT_UI_PREFERENCES, ...(data.uiPreferences || {}) },
        class: data.class || undefined,
        tokens: data.tokens || {},
        equipment: data.equipment || {},
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
      } as Character;
    } else {
      console.warn(`[Server Action getCharacterById] NOT FOUND: No character document found at path ${docPath}. This could be due to incorrect ID/path or Firestore security rules if the server's SDK instance is unauthenticated/lacks permissions.`);
      return null;
    }
  } catch (error: any) {
    console.error(`[Server Action getCharacterById] CATCH BLOCK: Error fetching character by ID from path users/${userId}/characters/${characterId}. Error:`, error.message, error.stack);
    if (error.code === 'permission-denied') {
        console.error("[Server Action getCharacterById] FIRESTORE PERMISSION DENIED. Check Firestore security rules. The server-side SDK instance (from firebase.server.ts) might be unauthenticated or lack permissions for this path. Server's own auth state was logged above.");
    }
    return null;
  }
}

export async function deleteCharacterAction(userId: string, characterId: string): Promise<{success: boolean, message: string}> {
  console.log(`[Server Action deleteCharacterAction] UserID: ${userId}, CharacterID: ${characterId}`);
  const serverAuthCurrentUser = serverAuthAction?.currentUser;
  console.log('[Server Action deleteCharacterAction] serverAuthAction.currentUser:', serverAuthCurrentUser ? serverAuthCurrentUser.uid : 'null');

  if (!userId || !characterId) {
    const errorMsg = "[Server Action deleteCharacterAction] User ID and/or Character ID are required for deletion.";
    console.error(errorMsg);
    return { success: false, message: errorMsg };
  }
  try {
    if (!db || !storage) {
        const serviceErrorMsg = "[Server Action deleteCharacterAction] CRITICAL: Firestore (db) or Storage service not available on server.";
        console.error(serviceErrorMsg);
        throw new Error(serviceErrorMsg);
    }

    const character = await getCharacterById(userId, characterId);
    if (character?.imageUrl) {
        try {
            const imagePath = `users/${userId}/characters/${characterId}/profileImage.png`;
            const imageStorageRef = storageRef(storage, imagePath);
            await deleteObject(imageStorageRef);
            console.log(`[Server Action deleteCharacterAction] Image deleted from Storage: ${imagePath}`);
        } catch (storageError: any) {
            if (storageError.code === 'storage/object-not-found') {
              console.warn(`[Server Action deleteCharacterAction] Image not found in Storage for path: ${imagePath}, proceeding with Firestore deletion.`);
            } else {
                console.error("[Server Action deleteCharacterAction] Error deleting character image from Storage, but proceeding with Firestore deletion. Storage Error:", storageError.message);
            }
        }
    }

    await deleteDoc(doc(db, 'users', userId, 'characters', characterId));
    console.log(`[Server Action deleteCharacterAction] Character deleted from Firestore: ${characterId}.`);

    revalidatePath('/dashboard');
    revalidatePath(`/characters/${characterId}`);

    return { success: true, message: "Character deleted successfully." };
  } catch (error: any) {
    console.error("[Server Action deleteCharacterAction] Catch Block - Error deleting character:", error.message, error.stack);
    return { success: false, message: `Failed to delete character. Server error: ${error.message}` };
  }
}

    