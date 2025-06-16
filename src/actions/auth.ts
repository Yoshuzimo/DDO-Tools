"use server";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth as serverAuthAction } from "@/lib/firebase.server"; // Renamed auth import
import { z } from "zod";

const emailSchema = z.string().email({ message: "Invalid email address." });
const passwordSchema = z
  .string()
  .min(6, { message: "Password must be at least 6 characters." });

const SignUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const LoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

interface AuthActionState {
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
    general?: string[];
  };
  success?: boolean;
  redirectPath?: string;
}

export async function signUpWithEmail(
  prevState: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState> {
  console.log(
    "[Server Action signUpWithEmail] Attempting sign up with formData:",
    Object.fromEntries(formData)
  ); // Debug
  const serverAuthCurrentUser = serverAuthAction?.currentUser; // Debug
  console.log(
    "[Server Action signUpWithEmail] serverAuthAction.currentUser (from firebase.server.ts) at start:",
    serverAuthCurrentUser ? serverAuthCurrentUser.uid : "null"
  ); // Debug

  const validatedFields = SignUpSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    console.error(
      "[Server Action signUpWithEmail] Validation failed:",
      validatedFields.error.flatten().fieldErrors
    );
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid fields. Could not sign up.",
      success: false,
    };
  }

  const { email, password } = validatedFields.data;
  console.log(`[Server Action signUpWithEmail] Validated email: ${email}`); // Debug

  try {
    if (!serverAuthAction) {
      console.error(
        "[SERVER ACTION CRITICAL] signUpWithEmail: serverAuthAction service is not available. Firebase server config issue."
      );
      return {
        errors: {
          general: [
            "Auth service unavailable on server. Please contact support.",
          ],
        },
        message: "Auth service unavailable on server. Please contact support.",
        success: false,
      };
    }
    const userCredential = await createUserWithEmailAndPassword(
      serverAuthAction,
      email,
      password
    );
    console.log(
      "[Server Action signUpWithEmail] Firebase createUser successful for user:",
      userCredential.user.uid
    ); // Debug
    const userFromServerAuthInstanceAfterCreate = serverAuthAction.currentUser; // Debug
    console.log(
      "[Server Action signUpWithEmail] serverAuthAction.currentUser AFTER createUser:",
      userFromServerAuthInstanceAfterCreate
        ? userFromServerAuthInstanceAfterCreate.uid
        : "null"
    ); // Debug
  } catch (error: any) {
    console.error(
      "[SERVER ACTION ERROR] signUpWithEmail Server-Side Firebase Error:",
      error,
      "Code:",
      error.code,
      "Message:",
      error.message
    );
    if (error.code === "auth/email-already-in-use") {
      return {
        errors: { email: ["This email is already in use."] },
        message: "This email is already in use.",
        success: false,
      };
    }
    return {
      errors: {
        general: [
          `Failed to sign up. Server error: ${
            error.message || error.code || "Unknown error"
          }. Please try again later.`,
        ],
      },
      message: `Failed to sign up. Server error: ${
        error.message || error.code || "Unknown error"
      }. Please try again later.`,
      success: false,
    };
  }

  console.log(
    "[Server Action signUpWithEmail] Sign up successful. Returning success state for client-side redirect to /dashboard"
  ); // Debug
  return {
    success: true,
    redirectPath: "/dashboard",
    message: "Sign up successful!",
  };
}

export async function loginWithEmail(
  prevState: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState> {
  console.log(
    "[Server Action loginWithEmail] Attempting login with formData:",
    Object.fromEntries(formData)
  ); // Debug
  const serverAuthCurrentUser = serverAuthAction?.currentUser; // Debug
  console.log(
    "[Server Action loginWithEmail] serverAuthAction.currentUser (from firebase.server.ts) at start:",
    serverAuthCurrentUser ? serverAuthCurrentUser.uid : "null"
  ); // Debug

  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    console.error(
      "[Server Action loginWithEmail] Validation failed:",
      validatedFields.error.flatten().fieldErrors
    );
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid fields. Could not log in.",
      success: false,
    };
  }

  const { email, password } = validatedFields.data;
  console.log(`[Server Action loginWithEmail] Validated email: ${email}`); // Debug

  try {
    if (!serverAuthAction) {
      console.error(
        "[SERVER ACTION CRITICAL] loginWithEmail: serverAuthAction service is not available. Firebase server config issue."
      );
      return {
        errors: {
          general: [
            "Auth service unavailable on server. Please contact support.",
          ],
        },
        message: "Auth service unavailable on server. Please contact support.",
        success: false,
      };
    }
    const userCredential = await signInWithEmailAndPassword(
      serverAuthAction,
      email,
      password
    );
    console.log(
      "[Server Action loginWithEmail] Firebase signIn successful for user:",
      userCredential.user.uid
    ); // Debug
    const userFromServerAuthInstanceAfterSignIn = serverAuthAction.currentUser; // Debug
    console.log(
      "[Server Action loginWithEmail] serverAuthAction.currentUser AFTER signIn:",
      userFromServerAuthInstanceAfterSignIn
        ? userFromServerAuthInstanceAfterSignIn.uid
        : "null"
    ); // Debug
  } catch (error: any) {
    console.error(
      "[SERVER ACTION ERROR] loginWithEmail Server-Side Firebase Error:",
      error,
      "Code:",
      error.code,
      "Message:",
      error.message
    );
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-email"
    ) {
      return {
        errors: { general: ["Invalid email or password."] },
        message: "Invalid email or password.",
        success: false,
      };
    }
    return {
      errors: {
        general: [
          `Failed to log in. Server error: ${
            error.message || error.code || "Unknown error"
          }. Please try again later.`,
        ],
      },
      message: `Failed to log in. Server error: ${
        error.message || error.code || "Unknown error"
      }. Please try again later.`,
      success: false,
    };
  }

  console.log(
    "[Server Action loginWithEmail] Login successful. Returning success state for client-side redirect to /dashboard"
  ); // Debug
  return {
    success: true,
    redirectPath: "/dashboard",
    message: "Login successful!",
  };
}

export async function signOut(): Promise<AuthActionState> {
  console.log("[Server Action signOut] Attempting sign out..."); // Debug
  const serverAuthCurrentUser = serverAuthAction?.currentUser; // Debug
  console.log(
    "[Server Action signOut] serverAuthAction.currentUser (from firebase.server.ts) at start:",
    serverAuthCurrentUser ? serverAuthCurrentUser.uid : "null"
  ); // Debug
  try {
    if (!serverAuthAction) {
      console.error(
        "[SERVER ACTION CRITICAL] signOut: serverAuthAction service is not available. Firebase server config issue."
      );
      return {
        message: "Auth service unavailable on server. Sign out failed.",
        success: false,
        redirectPath:
          "/auth/login?error=signout_failed_server_auth_unavailable",
      };
    }
    await firebaseSignOut(serverAuthAction);
    console.log("[Server Action signOut] Firebase signOut successful."); // Debug
    const userFromServerAuthInstanceAfterSignOut = serverAuthAction.currentUser; // Debug
    console.log(
      "[Server Action signOut] serverAuthAction.currentUser AFTER signOut:",
      userFromServerAuthInstanceAfterSignOut
        ? userFromServerAuthInstanceAfterSignOut.uid
        : "null"
    ); // Debug
  } catch (error: any) {
    console.error(
      "[SERVER ACTION ERROR] signOut Server-Side Firebase Error:",
      error,
      "Code:",
      error.code,
      "Message:",
      error.message
    );
    return {
      message: `Failed to sign out: ${error.message || error.code}`,
      success: false,
      redirectPath: `/auth/login?error=signout_failed_server_error&code=${
        error.code || "unknown"
      }`,
    };
  }
  console.log(
    "[Server Action signOut] Sign out successful. Returning success state for client-side redirect to /auth/login"
  ); // Debug
  return {
    success: true,
    redirectPath: "/auth/login",
    message: "Sign out successful.",
  };
}
