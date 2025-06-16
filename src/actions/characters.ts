'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getServerFirestore } from '@/lib/firebase/firebase.server';
import { getAuth as getServerAuth } from 'firebase-admin/auth';
import { getApp as getServerApp } from 'firebase-admin/app';
import { isValidCharacterName } from '@/lib/validation';

const formSchema = z.object({
  userId: z.string(),
  characterId: z.string(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters.')
    .refine((val) => isValidCharacterName(val), {
      message: 'Invalid characters in name.',
    }),
  token: z.string().min(10, 'Missing or invalid ID token.'),
});

export async function updateCharacterNameAction(
  prevState: any,
  formData: FormData
) {
  try {
    const parsed = formSchema.safeParse({
      userId: formData.get('userId'),
      characterId: formData.get('characterId'),
      name: formData.get('name'),
      token: formData.get('token'),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: 'Validation failed.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const { userId, characterId, name, token } = parsed.data;

    // ✅ Verify ID token using Firebase Admin SDK
    const decodedToken = await getServerAuth(getServerApp()).verifyIdToken(token);
    const uidFromToken = decodedToken.uid;

    if (uidFromToken !== userId) {
      return {
        success: false,
        message: 'User mismatch. Unauthorized update attempt.',
        errors: { general: ['You are not authorized to edit this character.'] },
      };
    }

    const db = getServerFirestore();
    const docRef = db.collection('users').doc(userId).collection('characters').doc(characterId);
    await docRef.update({ name });

    revalidatePath(`/characters/${characterId}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Character name updated successfully.',
      updatedName: name,
      errors: null,
    };
  } catch (err: any) {
    console.error('[updateCharacterNameAction] ERROR:', err);
    return {
      success: false,
      message: 'An unexpected error occurred.',
      errors: { general: [err.message || 'Unknown error'] },
    };
  }
}
